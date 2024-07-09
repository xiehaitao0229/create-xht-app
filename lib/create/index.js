"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const customConfigGetter_1 = __importDefault(require("./customConfigGetter"));
const renderTool_1 = __importDefault(require("./renderTool"));
async function create() {
    const renderData = await customConfigGetter_1.default.run();
    const renderTool = new renderTool_1.default(renderData);
    renderTool.render();
}
exports.default = create;
