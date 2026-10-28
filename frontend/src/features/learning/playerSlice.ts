import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PlayerState {
  activeQuestionId: string | null;

  answeredQuestionIds: string[];

  lastResult: { questionId: string; isCorrect: boolean; explanation: string } | null;

  saveState: 'idle' | 'saving' | 'saved' | 'error';
}

const initialState: PlayerState = {
  activeQuestionId: null,
  answeredQuestionIds: [],
  lastResult: null,
  saveState: 'idle',
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    playerInitialised(state, action: PayloadAction<string[]>) {
      state.answeredQuestionIds = action.payload;
      state.activeQuestionId = null;
      state.lastResult = null;
      state.saveState = 'idle';
    },

    questionTriggered(state, action: PayloadAction<string>) {
      state.activeQuestionId = action.payload;
      state.lastResult = null;
    },

    questionAnswered(
      state,
      action: PayloadAction<{ questionId: string; isCorrect: boolean; explanation: string }>,
    ) {
      if (!state.answeredQuestionIds.includes(action.payload.questionId)) {
        state.answeredQuestionIds.push(action.payload.questionId);
      }
      state.lastResult = action.payload;
    },

    questionDismissed(state) {
      state.activeQuestionId = null;
      state.lastResult = null;
    },

    saveStateChanged(state, action: PayloadAction<PlayerState['saveState']>) {
      state.saveState = action.payload;
    },

    playerReset() {
      return initialState;
    },
  },
});

export const {
  playerInitialised,
  questionTriggered,
  questionAnswered,
  questionDismissed,
  saveStateChanged,
  playerReset,
} = playerSlice.actions;

export default playerSlice.reducer;
