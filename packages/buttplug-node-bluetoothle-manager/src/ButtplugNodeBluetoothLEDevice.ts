/*!
 * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
 * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
 * project root for full license information.
 *
 * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
 */

import * as noble from "noble-mac";
import * as uuidParse from "uuid-parse";
import * as util from "util";
import { ButtplugDeviceImpl, BluetoothLEProtocolConfiguration, Endpoints, ButtplugDeviceWriteOptions, ButtplugDeviceReadOptions, ButtplugDeviceException } from "buttplug";

export class ButtplugNodeBluetoothLEDevice extends ButtplugDeviceImpl {

  private _characteristics: Map<Endpoints, noble.Characteristic> =
    new Map<Endpoints, noble.Characteristic>();
  private _notificationHandlers = new Map<Endpoints, (aNotification: boolean, aCharName: string) => void>();

  public constructor(private _deviceInfo: BluetoothLEProtocolConfiguration,
                     private _device: noble.Peripheral) {
    super(_device.advertisement.localName, _device.address);
  }

  public get Name(): string {
    return this._device.advertisement.localName!;
  }

  public get Id(): string {
    return this._device.id;
  }

  public get Connected(): boolean {
    // TODO How can we figure out connection status here?
    return true;
  }

  public Connect = async (): Promise<void> => {
    // Declare promisified versions of noble functions, just to keep things asyncy.
    const connectAsync: () => Promise<void> =
      util.promisify(this._device.connect.bind(this._device));
    const discoverServicesAsync: (x: string[]) => noble.Service[] =
      util.promisify(this._device.discoverServices.bind(this._device));

    await connectAsync();
    // God damnit noble why can't you just take a normal formatted UUID like
    // everyone else. Stripping all of the dashes out of our UUIDs because life
    // is horrible.
    let nobleServices = Array.from(this._deviceInfo.Services.keys()).map((x) => this.RegularToNobleUuid(x));

    // Caution: We have to do weird service uuid shortening rules because one
    // god damn line later everything continues to be fucking horrible and this
    // will miss services starting with 0000 because it assumes 16-bit shortened
    // form if we don't shorten them ourselves. This happens back in
    // RegularToNobleUuid also.
    let services = await discoverServicesAsync(nobleServices);

    if (services.length === 0) {
      throw new ButtplugDeviceException(`Cannot find any valid services on device ${this._device.advertisement.localName}`);
    }

    for (const service of services) {
      this._logger.Debug(`Found service ${service.uuid} for device ${this._device.advertisement.localName}`);
      const discoverCharsAsync: (x: string[]) => noble.Characteristic[] =
        util.promisify(service.discoverCharacteristics.bind(service));
      const serviceUuid = this.NobleToRegularUuid(service.uuid);
      const chrs = this._deviceInfo.Services.get(serviceUuid)!;

      if (chrs.size !== 0) {
        for (let [name, uuid] of chrs.entries()) {
          const nobleChr = this.RegularToNobleUuid(uuid);
          this._characteristics.set(name,
                                    (await discoverCharsAsync([nobleChr]))[0]);
        }
        continue;
      }
      // If no characteristics are present in the DeviceInfo block, we assume that
      // we're connecting to a simple rx/tx service, and can query to figure out
      // characteristics. Assume that the characteristics have tx/rx references.
      const characteristics = await discoverCharsAsync([]);
      for (const char of characteristics) {
        if (char.properties.indexOf("write") !== -1 ||
            char.properties.indexOf("writeWithoutResponse") !== -1 ||
            char.properties.indexOf("reliableWrite") !== -1) {
          this._characteristics.set(Endpoints.Tx, char);
        } else if (char.properties.indexOf("read") !== -1 ||
                   char.properties.indexOf("broadcast") !== -1 ||
                   char.properties.indexOf("notify") !== -1 ||
                   char.properties.indexOf("indicate") !== -1) {
          this._characteristics.set(Endpoints.Rx, char);
        }
      }
    }
  }

  private RegularToNobleUuid(aRegularUuid: string): string {
    // Noble autoshortens default IDs. This is fucking horrible and I'm not sure
    // how to turn it off. If we see something start with 4 0's, assume we'll
    // have to shorten.
    //
    // Find a new fucking maintainer already, Sandeep. Many of us have
    // offered. I know you're out there. You're updating your twitter.
    if (aRegularUuid.startsWith("0000")) {
      return aRegularUuid.substr(4, 4);
    }
    return aRegularUuid.replace(/-/g, "");
  }

  private NobleToRegularUuid(aNobleUuid: string): string {
    // And, once again, shortened IDs we have to convert by hand. God damnit.
    if (aNobleUuid.length === 4) {
      return `0000${aNobleUuid}-0000-1000-8000-00805f9b34fb`;
    }
    // I can't believe I'm bringing in a whole UUID library for this but such is
    // life in node.
    return uuidParse.unparse(Buffer.from(aNobleUuid, 'hex'));
  }

  public OnDisconnect = () => {
    this._device.disconnect();
    this.emit("deviceremoved");
  }

  public WriteValueInternal = async (aValue: Buffer, aOptions: ButtplugDeviceWriteOptions): Promise<void> => {
    if (!this._characteristics.has(aOptions.Endpoint)) {
      return;
    }
    const chr = this._characteristics.get(aOptions.Endpoint)!;
    return await util.promisify(chr.write.bind(chr))(aValue, false);
  }

  public ReadValueInternal = async (aOptions: ButtplugDeviceReadOptions): Promise<Buffer> => {
    if (!this._characteristics.has(aOptions.Endpoint)) {
      throw new ButtplugDeviceException(`Device ${this._device.advertisement.localName} has no endpoint named ${aOptions.Endpoint}`);
    }
    const chr = this._characteristics.get(aOptions.Endpoint)!;
    return await util.promisify(chr.read.bind(chr))();
  }

  public SubscribeToUpdatesInternal = async (aOptions: ButtplugDeviceReadOptions): Promise<void> => {
    this._logger.Debug(`Subscripting to updates on noble device ${this._device.advertisement.localName}`);
    if (!this._characteristics.has(aOptions.Endpoint)) {
      throw new ButtplugDeviceException(`Device ${this._device.advertisement.localName} has no endpoint named ${aOptions.Endpoint}`);
    }
    const chr = this._characteristics.get(aOptions.Endpoint)!;
    if (chr.properties.find((x) => x === "notify" || x === "indicate") === undefined) {
      throw new ButtplugDeviceException(`Device ${this._device.advertisement.localName} endpoint ${aOptions.Endpoint} does not have notify or indicate properties.`);
    }
    this._notificationHandlers.set(aOptions.Endpoint, (aIsNotification: boolean) => {
      this.CharacteristicValueChanged(aOptions.Endpoint, aIsNotification);
    });
    await util.promisify(chr.subscribe.bind(chr))();
    chr.on("data", this._notificationHandlers.get(aOptions.Endpoint)!);
    return Promise.resolve();
  }

  public Disconnect = (): Promise<void> => {
    return Promise.resolve();
  }

  protected CharacteristicValueChanged = async (aCharName: Endpoints, aIsNotification: boolean) => {
    // The notification doesn't come with the value, so we have to manually read it out of rx.
    const buffer = await this.ReadValue(new ButtplugDeviceReadOptions({ Endpoint: aCharName }));
    this.UpdateReceived(aCharName, buffer);
  }
}
