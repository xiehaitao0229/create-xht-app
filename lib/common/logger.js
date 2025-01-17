"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
function log(...args) {
    console.log('[Create-qfe-app]:', ...args);
}
const logger = (...args) => {
    log(...args);
};
const externalMethods = ['red', 'green'];
externalMethods.forEach((_) => {
    ;
    logger[_] = (...args) => {
        log(...args.map((a) => chalk_1.default[_](a)));
    };
});
exports.default = logger;
