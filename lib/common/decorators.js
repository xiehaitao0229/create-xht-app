"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeShell = void 0;
const shelljs_1 = __importDefault(require("shelljs"));
function safeShell(_target, _name, descriptor) {
    const d = descriptor;
    const oldValue = d.value;
    d.value = function (...args) {
        const cwd = process.cwd();
        const result = oldValue.apply(this, args);
        shelljs_1.default.cd(cwd);
        return result;
    };
}
exports.safeShell = safeShell;
