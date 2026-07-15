/**
 * AI Profile Question Configuration
 *
 * 獨立的問題設定檔，方便未來新增或修改題目。
 * 不要把問題內容寫死在 UI 元件內。
 */

export type AIProfileFieldKey =
  | 'analysisPriority'
  | 'drawdownTolerance'
  | 'investmentStyle'
  | 'goalTradeoff'
  | 'investmentHorizon';

export type QuestionOption = {
  value: string;
  label: string;
};

export type QuestionConfig = {
  id: string;
  fieldKey: AIProfileFieldKey;
  question: string;
  /** 顯示在問題下方的補充說明 */
  hint?: string;
  options: QuestionOption[];
  /** 回答後顯示的回饋文字，key 為選項 value */
  feedback: Record<string, string>;
};

/**
 * Question 4 有兩種版本：
 * - hasGoalDeadline: true → 問 goalTradeoff
 * - hasGoalDeadline: false → 問 investmentHorizon
 */
export type Question4Variant = 'goal_tradeoff' | 'investment_horizon';

const QUESTION_1: QuestionConfig = {
  id: 'analysis_priority',
  fieldKey: 'analysisPriority',
  question: '你希望 AI 分析時最重視什麼？',
  options: [
    { value: 'stability', label: '資產穩定' },
    { value: 'growth', label: '長期成長' },
    { value: 'income', label: '穩定配息' },
    { value: 'goal_completion', label: '優先完成目前目標' },
    { value: 'unsure', label: '還不確定' },
  ],
  feedback: {
    stability: '了解了。之後的分析會更注意波動風險，幫你守住資產。',
    growth: '了解了。之後的分析會著重長期成長潛力。',
    income: '了解了。之後的分析會更關注配息穩定度與殖利率。',
    goal_completion: '了解了。之後的分析會更重視你的目標完成時間，而不只看投資報酬。',
    unsure: '沒問題，之後可以隨時回來調整。',
  },
};

const QUESTION_2: QuestionConfig = {
  id: 'drawdown_tolerance',
  fieldKey: 'drawdownTolerance',
  question: '如果投資暫時下跌，你大約可以接受多少？',
  hint: '這只是幫助 AI 調整提醒方式，不代表正式風險評估。',
  options: [
    { value: 'low', label: '約 5%，我會感到不安' },
    { value: 'medium_low', label: '約 10%' },
    { value: 'medium', label: '約 20%' },
    { value: 'high', label: '30% 以上也能長期持有' },
    { value: 'unsure', label: '還不確定' },
  ],
  feedback: {
    low: '了解了。之後如果波動較大，AI 會提早提醒你。',
    medium_low: '了解了。AI 會在下跌接近 10% 時特別留意。',
    medium: '了解了。你對波動有一定的承受力，AI 不會太頻繁提醒。',
    high: '了解了。你對波動相當有耐心，AI 會著重長期趨勢分析。',
    unsure: '沒問題，之後可以隨時回來調整。',
  },
};

const QUESTION_3: QuestionConfig = {
  id: 'investment_style',
  fieldKey: 'investmentStyle',
  question: '哪一種方式最接近你目前的投資方式？',
  options: [
    { value: 'dca', label: '定期定額' },
    { value: 'buy_and_hold', label: '買入後長期持有' },
    { value: 'income', label: '以配息為主' },
    { value: 'active', label: '會依市場主動調整' },
    { value: 'beginner', label: '剛開始，還沒有固定方式' },
  ],
  feedback: {
    dca: '了解了。AI 會參考定期定額的節奏來分析你的投資。',
    buy_and_hold: '了解了。AI 會著重長期持有的觀點來分析。',
    income: '了解了。AI 會更關注配息相關的資訊。',
    active: '了解了。AI 會提供更即時的市場觀察角度。',
    beginner: '了解了。AI 會用更容易理解的方式說明分析結果。',
  },
};

const QUESTION_4_GOAL_TRADEOFF: QuestionConfig = {
  id: 'goal_tradeoff',
  fieldKey: 'goalTradeoff',
  question: '當準時完成目標和追求更高成長衝突時，你比較重視什麼？',
  options: [
    { value: 'goal_first', label: '準時完成目標' },
    { value: 'balanced', label: '兩者平衡' },
    { value: 'growth_first', label: '可以延後目標，追求成長' },
    { value: 'unsure', label: '還不確定' },
  ],
  feedback: {
    goal_first: '了解了。AI 會優先確保你的目標能如期達成。',
    balanced: '了解了。AI 會兼顧目標進度與成長機會。',
    growth_first: '了解了。AI 會著重成長機會，目標時程可以彈性調整。',
    unsure: '沒問題，之後可以隨時回來調整。',
  },
};

const QUESTION_4_HORIZON: QuestionConfig = {
  id: 'goal_tradeoff',
  fieldKey: 'investmentHorizon',
  question: '這筆投資的錢，大約什麼時候可能需要使用？',
  options: [
    { value: 'within_1_year', label: '一年內' },
    { value: 'one_to_three_years', label: '1～3 年' },
    { value: 'three_to_five_years', label: '3～5 年' },
    { value: 'over_five_years', label: '5 年以上' },
    { value: 'unsure', label: '還不確定' },
  ],
  feedback: {
    within_1_year: '了解了。AI 會特別注意短期風險。',
    one_to_three_years: '了解了。AI 會平衡短期穩定與中期成長。',
    three_to_five_years: '了解了。AI 會著重中長期的投資策略。',
    over_five_years: '了解了。AI 會以長期成長的角度來分析。',
    unsure: '沒問題，之後可以隨時回來調整。',
  },
};

/** 前三題固定順序 */
export const BASE_QUESTIONS: QuestionConfig[] = [
  QUESTION_1,
  QUESTION_2,
  QUESTION_3,
];

/** 第四題：依使用者是否有目標日期選擇版本 */
export function getQuestion4(hasGoalDeadline: boolean): QuestionConfig {
  return hasGoalDeadline ? QUESTION_4_GOAL_TRADEOFF : QUESTION_4_HORIZON;
}

/** 取得所有問題（含第四題） */
export function getAllQuestions(hasGoalDeadline: boolean): QuestionConfig[] {
  return [...BASE_QUESTIONS, getQuestion4(hasGoalDeadline)];
}

/** 問題總數 */
export const TOTAL_QUESTIONS = 4;
