"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prompts_1 = __importDefault(require("prompts"));
const logger_1 = __importDefault(require("../common/logger"));
async function singlePrompt(p, data) {
    if (data && data[p.name] !== undefined) {
        return {
            [p.name]: data[p.name],
        };
    }
    return prompts_1.default(p, {
        onCancel() {
            logger_1.default.red('获取配置中断');
            process.exit(1);
        },
    });
}
async function default_1(ps, data) {
    if (!Array.isArray(ps))
        return await singlePrompt(ps, data);
    let answer = {};
    for (const p of ps) {
        answer = Object.assign(Object.assign({}, answer), (await singlePrompt(p, data)));
    }
    return answer;
}
exports.default = default_1;
