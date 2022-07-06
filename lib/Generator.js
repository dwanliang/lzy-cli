// lib/Generator.js

const ora = require('ora')
const inquirer = require('inquirer')
const { getRepoList, getTagList } = require('./http')
const util = require('util')
const path = require('path')
const chalk = require('chalk')
const downloadGitRepo = require('download-git-repo') // 不支持 Promise
const { spawnSync } = require('child_process')
// 添加加载动画
async function wrapLoading(fn, message, ...args) {
  // 使用 ora 初始化，传入提示信息 message
  const spinner = ora(message);
  // 开始加载动画
  spinner.start();

  try {
    // 执行传入方法 fn
    const result = await fn(...args);
    // 状态为修改为成功
    spinner.succeed();
    return result; 
  } catch (error) {
    console.log("🚀 ~ error", error)
    // 状态为修改为失败
    spinner.fail('Request failed, refetch ...')
  } 
}

class Generator {
  constructor (name, targetDir){
    // 目录名称
    this.name = name;
    // 创建位置
    this.targetDir = targetDir;
    // 对 download-git-repo 进行 promise 化改造
    this.downloadGitRepo = util.promisify(downloadGitRepo);
  }

  // 获取用户选择的模板
  // 1）从远程拉取模板数据
  // 2）用户选择自己新下载的模板名称
  // 3）return 用户选择的名称

  async getRepo() {
    // 1）从远程拉取模板数据
    const repoList = await wrapLoading(getRepoList, '获取模板...');
    if (!repoList) return;

    // 过滤我们需要的模板名称
    let repos = [];
    repoList.forEach(item => {
      if (item.name.indexOf('.x') > -1) {
        repos.push(item.name);
      }
    });
    // 2）用户选择自己新下载的模板名称
    const { repo } = await inquirer.prompt({
      name: 'repo',
      type: 'list',
      choices: repos,
      message: '请选择vue.js的版本'
    })

    // 3）return 用户选择的名称
    return repo;
  }


  // 下载远程模板
  // 1）拼接下载地址
  // 2）调用下载方法
  async download(branch){

    // 1）拼接下载地址
    const requestUrl = `dwanliang/vue-template#${branch}`;

    // 2）调用下载方法
    await wrapLoading(
      this.downloadGitRepo, // 远程下载方法
      '下载模板中...', // 加载提示信息
      requestUrl, // 参数1: 下载地址
      path.resolve(process.cwd(), this.targetDir)) // 参数2: 创建位置
  }
  async installRely() {
    // 使用 ora 初始化，传入提示信息 message
    const spinner = ora('安装依赖');
    // 开始加载动画
    spinner.start();
    spawnSync(`npm`, ['install'], {cwd: path.resolve(process.cwd(), this.targetDir), shell: /^win/.test(process.platform)})
    spinner.succeed();
  }

  // 核心创建逻辑
  // 1）选择模板分支
  // 2）下载模板到模板目录
  async create(){

    // 1）选择模板分支
    const branch = await this.getRepo()

    // 2）下载模板到模板目录
    await this.download(branch)
    
    // 3. 安装依赖
    this.installRely()
    
    // 3）模板使用提示
    console.log(`\r\n创建成功，您的项目 ->>>>>>> ${chalk.cyan(this.name)}`)
    console.log(`\r\n  cd ${chalk.cyan(this.name)}`)
    console.log('  npm run dev\r\n')
  }
}

module.exports = Generator;
