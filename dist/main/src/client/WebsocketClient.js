"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var Client_1 = require("./Client");
var ButtplugWebsocketClient = (function (_super) {
    __extends(ButtplugWebsocketClient, _super);
    function ButtplugWebsocketClient(aClientName) {
        var _this = _super.call(this, aClientName) || this;
        _this.Connect = function (aUrl) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var ws, res, rej, p, conErrorCallback;
            return __generator(this, function (_a) {
                ws = new WebSocket(aUrl);
                p = new Promise(function (resolve, reject) { res = resolve; rej = reject; });
                conErrorCallback = function (ev) { rej(ev); };
                ws.addEventListener("open", function (ev) { return __awaiter(_this, void 0, void 0, function () {
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                this._ws = ws;
                                this._ws.addEventListener("message", function (aMsg) { _this.ParseIncomingMessage(aMsg); });
                                this._ws.removeEventListener("close", conErrorCallback);
                                this._ws.addEventListener("close", this.Disconnect);
                                return [4 /*yield*/, this.InitializeConnection()];
                            case 1:
                                if (!(_a.sent())) {
                                    rej();
                                    return [2 /*return*/];
                                }
                                res();
                                return [2 /*return*/];
                        }
                    });
                }); });
                ws.addEventListener("close", conErrorCallback);
                return [2 /*return*/, p];
            });
        }); };
        _this.Disconnect = function () {
            if (!_this.Connected) {
                return;
            }
            _this.ShutdownConnection();
            _this._ws.close();
            _this._ws = undefined;
            _this.emit("close");
        };
        _this.Send = function (aMsg) {
            if (!_this.Connected) {
                throw new Error("ButtplugClient not connected");
            }
            _this._ws.send(aMsg);
        };
        return _this;
    }
    Object.defineProperty(ButtplugWebsocketClient.prototype, "Connected", {
        get: function () {
            return this._ws !== undefined;
        },
        enumerable: true,
        configurable: true
    });
    return ButtplugWebsocketClient;
}(Client_1.ButtplugClient));
exports.ButtplugWebsocketClient = ButtplugWebsocketClient;
//# sourceMappingURL=WebsocketClient.js.map