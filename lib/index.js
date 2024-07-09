"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const commander_1 = require("commander");
const jsonfile_1 = __importDefault(require("jsonfile"));
const create_1 = __importDefault(require("./create"));
const resetByChangingConfig_1 = __importDefault(require("./update/resetByChangingConfig"));
const updateFromTemplate_1 = __importDefault(require("./update/updateFromTemplate"));
const { version } = jsonfile_1.default.readFileSync(path_1.resolve(__dirname, '..', 'package.json'));
async function main() {
    commander_1.program.version(version);
    commander_1.program
        .command('create')
        .description('Create a new app')
        .action(async () => {
        await create_1.default();
    });
    commander_1.program
        .command('update', { isDefault: true })
        .description('Update an app based on the updated template')
        .action(async () => {
        await updateFromTemplate_1.default();
    });
    commander_1.program
        .command('reset')
        .description('Reset an app according to the updated configuration')
        .action(async () => {
        await resetByChangingConfig_1.default();
    });
    commander_1.program.parse(process.argv);
}
main();
