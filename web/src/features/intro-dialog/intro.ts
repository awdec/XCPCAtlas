/**
 * 首页介绍弹窗的显示规则（B-H4）：
 * localStorage 记录上次关闭时间戳，超过 7 天再次弹出；key 带版本号，文案改版时升版本让用户再看一次。
 * 存储不可用（隐私模式等）时静默忽略，下次进入会再弹。
 */
export const INTRO_SEEN_KEY = 'xcpc_intro_seen_v1'
export const INTRO_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

export const INTRO_TEXT = '本平台收录了 2020-2026 赛季 ICPC/CCPC 各赛区的比赛结果。您可以通过首页查看各赛区概况，在"全部成绩"页搜索和筛选所有队伍，并查看选手的 OI 竞赛获奖经历。\n\n同时还提供了各个赛站和当年赛站总情况的数据分析，可以通过具体年份的"数据分析"查看具体内容：包括获奖率、赛站之间的获奖重合度、各奖牌具体 OI 奖项数量等。'

export function shouldShowIntro(stored: string | null | undefined, now: number): boolean {
  const lastSeen = Number(stored) || 0
  return !lastSeen || now - lastSeen > INTRO_INTERVAL_MS
}

export function readIntroSeen(): string | null {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY)
  } catch {
    return null
  }
}

export function writeIntroSeen(now: number): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, String(now))
  } catch {
    // 隐私模式等存储不可用时忽略，页面不受影响（下次进入会再弹）
  }
}
