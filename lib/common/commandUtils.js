"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const shelljs_1 = __importDefault(require("shelljs"));
const constants_1 = require("./constants");
const decorators_1 = require("./decorators");
class Utils {
    constructor(opts) {
        this.noBase = false;
        this.baseUrl = constants_1.GIT_CACHE_BASE_URL;
        this.reset(opts);
    }
    reset(opts) {
        opts = opts || {};
        this.noBase = opts.noBase || false;
        this.baseUrl = opts.baseUrl || this.baseUrl;
    }
    absolute(path) {
        return this.noBase ? path : path_1.resolve(this.baseUrl, path);
    }
    exec(cmd, opts) {
        this.noBase || shelljs_1.default.cd(this.baseUrl);
        return shelljs_1.default
            .exec(cmd, opts || {})
            .toString()
            .trim();
    }
    execSilently(cmd, opts) {
        return this.exec(cmd, Object.assign(Object.assign({}, opts), { silent: true }));
    }
    exist(path) {
        return fs_1.default.existsSync(this.absolute(path));
    }
    readFileSync(path) {
        return fs_1.default.readFileSync(this.absolute(path), { encoding: 'utf-8' });
    }
    writeFileSync(path, data) {
        return fs_1.default.writeFileSync(this.absolute(path), data);
    }
}
Utils.originCwd = process.cwd();
__decorate([
    decorators_1.safeShell
], Utils.prototype, "exec", null);
exports.default = Utils;
