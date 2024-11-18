"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
exports.RedisClient = void 0;
var redis = require("redis");
function getRedisPropertiesFromEnv() {
    var redisHost = process.env.REDIS_ENDPOINT || 'localhost';
    var redisPort = process.env.REDIS_PORT || '6379';
    return { redisHost: redisHost, redisPort: redisPort };
}
var RedisClient = /** @class */ (function () {
    function RedisClient(redisHost, redisPort) {
        this.client = redis.createClient({
            url: "redis://".concat(redisHost, ":").concat(redisPort), // Use Redis host and port as arguments
            socket: {
                tls: false,
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.client.on('error', function (err) { return console.error('Redis Client Error', err); });
        this.client.connect().catch(console.error); // Ensure connection on client creation
    }
    // Static method to get the singleton instance
    RedisClient.getInstance = function () {
        var _a = getRedisPropertiesFromEnv(), redisHost = _a.redisHost, redisPort = _a.redisPort;
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient(redisHost, redisPort);
        }
        return RedisClient.instance;
    };
    RedisClient.prototype.setWithExpiry = function (key, value, ttl) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.setEx(key, ttl, value)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RedisClient.prototype.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.get(key)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    RedisClient.prototype.delete = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.del(key)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RedisClient.prototype.lpush = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.lPush(key, value)];
                    case 1:
                        _a.sent(); // Use lPush for the lpush command
                        return [2 /*return*/];
                }
            });
        });
    };
    RedisClient.prototype.blpop = function (key, timeout) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.client.blPop(key, timeout)];
                    case 1:
                        result = _a.sent();
                        if (!result) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, [result.key, result.element]];
                }
            });
        });
    };
    RedisClient.instance = null;
    return RedisClient;
}());
exports.RedisClient = RedisClient;
