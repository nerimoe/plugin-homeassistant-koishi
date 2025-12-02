import { Context, Schema } from 'koishi'
import { switch_off, switch_on } from './actions';
export const name = 'homeassistant'

export interface Config {
  url: string,
  token: string,
  entities: { [alias: string]: string }
}

export const Config: Schema<Config> = Schema.object({
  url: Schema.string().required().description('Home Assistant 的 url'),
  token: Schema.string().required().description('长期访问令牌'),
  entities: Schema.dict(Schema.string().required().description("实体ID"), Schema.string().required().description("实体别名")).role('table').description('实体列表')
})

export function apply(ctx: Context, config: Config) {
  ctx.http.config.baseURL = config.url;
  ctx.http.config.headers = {
    "Authorization": `Bearer ${config.token}`,
    "Content-Type": "application/json"
  }
  ctx.command('on <alias>')
    .action(async (_, alias) => {
      let entityId = config.entities[alias];
      if (entityId == null) return "设备不存在";
      if (await switch_on(ctx, config, entityId)) {
        return `${alias} 启动成功`;
      } else {
        return `${alias} 启动失败，内部错误，请联系管理人员`;
      };
    });
  ctx.command('off <alias>')
    .action(async (_, alias) => {
      let entityId = config.entities[alias];
      if (entityId == null) return "设备不存在";
      if (await switch_off(ctx, config, entityId)) {
        return `${alias} 关闭成功`;
      } else {
        return `${alias} 关闭失败，内部错误，请联系管理人员`;
      };
    });
  ctx.command('show <alias>')
    .action(async (__dirname, alias) => {
      let entityId = config.entities[alias];
      let response = await ctx.http.get(`/api/states/${entityId}`);
      return `${alias} 当前状态：${response.state}`;
    })

}
