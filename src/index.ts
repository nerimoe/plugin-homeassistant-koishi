import { Context, Schema } from 'koishi'
import { switch_off, switch_on } from './actions';
export const name = 'homeassistant'

export interface Config {
  url: string,
  token: string,
  entities: { [name: string]: string }
  alias: { [alias: string]: string }
}

export const Config: Schema<Config> = Schema.object({
  url: Schema.string().required().description('Home Assistant 的 url'),
  token: Schema.string().required().description('长期访问令牌'),
  entities: Schema.dict(
    Schema.string().required().description("实体ID"),
    Schema.string().required().description("实体名")).role('table').description('实体列表'),
  alias: Schema.dict(
    Schema.string().required().description("实体名"),
    Schema.string().required().description("实体别名")).role('table').description('实体别名'),
})

function getDeviceId(nameOrAlias: string, config: Config) {
  let entityId = config.entities[nameOrAlias];
  let name = nameOrAlias;
  if (entityId == null) {
    name = config.alias[nameOrAlias];
    entityId = config.entities[name];
    if (entityId == null) {
      throw Error("设备不存在")
    }
  };
  return { name, id: entityId };
}

export function apply(ctx: Context, config: Config) {
  try {
    ctx.http.config.baseURL = config.url;
    ctx.http.config.headers = {
      "Authorization": `Bearer ${config.token}`,
      "Content-Type": "application/json"
    }
    ctx.command('on <alias>')
      .action(async (_, alias) => {
        let dev = getDeviceId(alias, config);
        if (await switch_on(ctx, config, dev.id)) {
          return `${dev.name} 启动成功`;
        } else {
          return `${dev.name} 启动失败，内部错误，请联系管理人员`;
        };
      });
    ctx.command('off <alias>')
      .action(async (_, alias) => {
        if (alias == "all") {
          let promises = [];
          let devs: { name: string, status: boolean }[] = [];
          Object.entries(config.entities).forEach(([name, id]) => {
            promises.push(switch_off(ctx, config, id));
            devs.push({ name, status: false })
          });
          let results = await Promise.all(promises);
          results.forEach((res, idx) => { devs[idx].status = res });
          let str = "";
          devs.forEach((dev) => {
            if (dev.status) {
              str += `${name} 关闭成功\n`;
            } else {
              str += `${name} 关闭失败，内部错误，请联系管理人员\n`;
            }
          })
          return str;
        } else {
          let dev = getDeviceId(alias, config);
          if (await switch_off(ctx, config, dev.id)) {
            return `${dev.name} 关闭成功`;
          } else {
            return `${dev.name} 关闭失败，内部错误，请联系管理人员`;
          };
        }
      });
    ctx.command('show [alias]')
      .action(async (__dirname, alias) => {
        if (alias == undefined) {
          let promises = [];
          let devs: { name: string, status: string }[] = [];
          Object.entries(config.entities).forEach(([name, id]) => {
            promises.push(ctx.http.get(`/api/states/${id}`));
            devs.push({ name, status: "unknown" });
          });
          let results = await Promise.all(promises);
          results.forEach((res, idx) => {
            devs[idx].status = res.state;
          })
          let str = "";
          devs.forEach((dev) => {
            str += `${dev.name}: ${dev.status}\n`
          })
          return str;
        } else {
          let dev = getDeviceId(alias, config);
          let response = await ctx.http.get(`/api/states/${dev.id}`);
          return `${dev.name} 当前状态：${response.state}`;
        }
      })

  } catch (e) {
    return e.message
  }
}
