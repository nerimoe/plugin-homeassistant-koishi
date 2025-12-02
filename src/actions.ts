import { Context } from "koishi";
import { Config } from ".";



export async function switch_on(ctx: Context, config: Config, entity_id: string): Promise<boolean> {
    const endpoint = '/api/services/switch/turn_on';
    try {
        let response = await ctx.http.post(endpoint, { entity_id });
        return true;
    } catch (e) {
        console.log(JSON.stringify(e))
        return false;
    }
}

export async function switch_off(ctx: Context, config: Config, entity_id: string) {
    const endpoint = '/api/services/switch/turn_off';
    try {
        let response = await ctx.http.post(endpoint, { entity_id });
        return true;
    } catch (e) {
        console.log(JSON.stringify(e))
        return false;
    }
}