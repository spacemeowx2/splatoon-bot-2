import { Argv, Context } from 'koishi'

export const name = 'splatoon2'

async function stageHandler(argv: Argv) {
  return 'hello world!'
}

export function apply(ctx: Context) {
  ctx.command('图', '获取当前或未来的地图')
    .action(stageHandler)

}
