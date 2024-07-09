<div align="center">
  <img src="https://qpark-tool-public.wlmkids.com/qpark/2021/5/12/d35ca30f8cf9459da4f58a7fc78cf971.png" width="300">
</div>

## create-xht-app

![效果](http://img002.qufenqi.com/products/a4/c8/a4c843a261521eaf494088deb8902453.png)

### 使用方式 - For `@业务开发人`

**放在前面特殊说明，用当前工具创建的仓储，必须保证仓储名和仓储 SSH url 里最后一级一致**，如：仓储名为 `a`，则其 SSH url 可以是`git@xxx:xxx/xxx/a.git`，但不能是`git@xxx:xxx/xxx/bbb.git`。

首先，先保证你能访问私有 npm ，即在你的`~.npmrc`中加入：

```
@qfe:registry=http://r.npmjs.xht.com/
```

然后你能选择一下两种方式创建业务仓储

**A. 在 git 空仓储上创建**

1. 通过 `git` 初始化一个空仓储；
2. 到该空仓储目录下执行 `npx @qfe/create-xht-app`；
3. 根据提示进行选择或输入，其中：
4. 当提示 `是否在当前目录创建仓储` 时，选择 `yes`；
5. 如果是创建一个仓储模板，则在提示 `创建的是否是仓储模板` 时，选择 `yes`；如果是创建业务仓储，则选择 `no`；

**B. 不在仓储中创建**

1. 执行 `npx @qfe/create-xht-app`；
2. 根据提示进行选择或输入，其中：
3. 当提示 `是否在当前目录创建仓储` 时，选择 `no`；
4. 当提示 `请输入新建仓储的名字` 时，输入想要创建的项目名，效果是在当前目录下创建一个对应项目名的空目录，并在目录中创建；
5. 如果是创建一个仓储模板，则在提示 `创建的是否是仓储模板` 时，选择 `yes`；如果是创建业务仓储，则选择 `no`。

#### 更快捷的使用方式

如果你经常使用本工具，有以下建议：

1. 直接`npm i @qfe/create-xht-app -g`后，每次执行`create-xht-app`即可。
2. 如果上述执行过程中出现报错`mkdir: cannot create directory /usr/local/lib/node_modules/@qfe/create-xht-app/.gitCache: Permission denied`，则执行以下命令并输入密码即可：

```
cd /usr/local/lib/node_modules/@qfe
sudo chmod -R 777 create-xht-app
```

### 根据源模板仓储升级生成的仓储 - For `@模板开发人` & `@业务开发人`

当源模板仓储有更新，希望同步到根据源模板仓储生成的模板/业务仓储（以下称为目标仓储）上的时候，除了手动复制粘贴，可以通过以下操作较快捷地完成诉求：

1. 确保目标仓储里的 `.ktconfig.json` 里有以下字段（版本`v0.3.4`以及之后的`create-xht-app`会自动生成这个字段：

```json
{
  "origin": {
    "git": "源模板仓储的 git 仓储地址",
    "commit": "生成/更新目标仓储式，源模板仓储的 commit hash"
  }
}
```

2. 到目标仓储的根目录下，**将代码同步到与主干分支最新代码一致**，执行：`npx @qfe/create-xht-app update`；如果执行成功，会看到以下输出：

```
已经根据模板更新完毕！
```

3. 按上述提示后有冲突提示，请根据提示对冲突文件进行冲突解决。

### 更改配置进而更新仓储 - For `@模板开发人` & `@业务开发人`

生成仓储后，如果需要对初始化的配置进行修改，并更新相关的代码，可以通过以下操作较快捷地完成诉求：

1. 确保目标仓储里的 `.ktconfig.json` 里有以下字段（版本`v0.4.0`以及之后的`create-xht-app`会自动生成这个字段：

```json
{
  "initedOptions": {}
}
```

2. 更新上述 `initedOptions` 中对应的配置；

3. 到目标仓储的根目录下，执行：`npx @qfe/create-xht-app reset`；如果执行成功，会看到以下输出：

```
已经根据最新配置更新完毕！
```

4. 按上述提示后有冲突提示，请根据提示对冲突文件进行冲突解决。

### 和模板仓储的交互 - For `@模板开发人`

在模板仓储的根目录下，必须有 `.ktconfig.json` 文件，里面的 `initOptions` 字段是一个数组，每个数组元素代表需要向用户收集的信息，其格式如下：

```json
{
  "initOptions": [
    {
      "prompt": {
        "type": "text",
        "name": "projectName",
        "message": "请输入新建仓储的名字"
      },
      "globPatterns": "./package.json",
      "replacePattern": "@qfe/qfe-template-base"
    },
    {
      "prompt": {
        "type": "text",
        "name": "npmVersion",
        "message": "请输入版本号",
        "initial": "0.0.1"
      },
      "globPatterns": "./package.json",
      "replacePattern": "0.0.1"
    },
    {
      "prompt": {
        "type": "text",
        "name": "npmDescription",
        "message": "请输入仓储描述",
        "initial": ""
      },
      "globPatterns": "./package.json",
      "replacePattern": "配合create-xht-app使用的前端基础工程仓储模板"
    }
  ]
}
```

其中：

- `prompt`：表示向用户收集信息时，给出的相关提示，相关格式可参考 [Prompts - Prompt Objects](https://github.com/terkelg/prompts#-prompt-objects)；
  - `initial`：
    - 当对应的值为字符串时，拥有 [mustache](https://github.com/janl/mustache.js) 渲染模板能力，渲染的数据源为之前已经输入的信息；
    - 该字段如果为 `undefined` 或为字符串时，会在某些规则下被自动灌入内容，具体规则见 `src/create/customConfigGetter.ts` 中的 `CustomConfigGetter.enhanceInitial`；
- `globPatterns`：表示用 glob 匹配文件的式子，相关格式可参考 [Glob - Glob Primer](https://github.com/isaacs/node-glob#glob-primer)；
- `globOpts`：表示 glob 的参数，相关格式可参考 [Glob - Options](https://github.com/isaacs/node-glob#options)；
- `replacePattern`：表示要替换掉的内容；
- `replaceTemplate`：表示要替换成的内容的模板；

通过以上字段，开发者可以根据自身需求利用以下几种渲染能力：

**利用 [mustache](https://github.com/janl/mustache.js) 渲染模板**
`package.json`（模板文件）：

```
{
  "name": "{{ projectName }}"
}
```

`ktconfig.json`：

```json
{
  "prompt": {
    "type": "text",
    "name": "projectName",
    "message": "请输入新建仓储的名字"
  },
  "globPatterns": "./package.json"
}
```

执行命令并在相关提示下输入 `New Project` 后，`package.json`（生成的文件）：

```
{
  "name": "New Project"
}
```

**利用简单替换渲染模板**
`package.json`（模板文件）：

```
{
  "name": "@qfe/qfe-template-base"
}
```

`ktconfig.json`：

```json
{
  "prompt": {
    "type": "text",
    "name": "projectName",
    "message": "请输入新建仓储的名字"
  },
  "globPatterns": "./package.json",
  "replacePattern": "@qfe/qfe-template-base"
}
```

执行命令并在相关提示下输入 `New Project` 后，`create-xht-app` 会到 `package.json` 下找到 `@qfe/qfe-template-base`，并替换成 `New Project`，所以 `package.json`（生成的文件）：

```
{
  "name": "New Project"
}
```

**利用模板替换渲染模板**
`package.json`（模板文件）：

```
{
  "name": "@qfe/qfe-template-base"
}
```

`ktconfig.json`：

```json
{
  "prompt": {
    "type": "text",
    "name": "projectName",
    "message": "请输入新建仓储的名字"
  },
  "globPatterns": "./package.json",
  "replacePattern": "@qfe/qfe-template-base",
  "replaceTemplate": "wanwu.{{ projectName }}"
}
```

执行命令并在相关提示下输入 `mp` 后，`create-xht-app` 会到 `package.json` 下找到 `@qfe/qfe-template-base`，并替换成 `wanwu.mp`，所以 `package.json`（生成的文件）：

```
{
  "name": "wanwu.mp"
}
```

**注意**

- `ktconfig.json` 数组的第一个元素，`prompt.name` 的值必须 为`projectName`；

**TODO**

- 目前一个 `prompt` 只能依照一套 `globPattern`、`globOpts`、`replacePattern`、`replaceTemplate` 进行替换，后续可以扩展成可替换多套。

### create-xht-app 开发 - For `@工具开发人`

**安装依赖**

```
yarn
```

**开发**

```
yarn dev
```

**测试**

```
mkdir `${Your Workspace}`
cd `${Your Workspace}`
node `${Root of create-xht-app}`/bin/create-xht-app
```

**发包**

```
# 非补丁版本
yarn build
npm version `${New Version}`
npm publish

# 补丁版本
yarn pub
```
