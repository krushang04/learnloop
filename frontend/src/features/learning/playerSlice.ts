import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Client-only player state. The playhead itself lives on the <video> element —
 * mirroring it into Redux on every frame would re-render the whole tree four
 * times a second. Only the facts other components need are kept here.
 */
export interface PlayerState {
  /** Question currently blocking playback, or null when the video is free to play. */
  activeQuestionId: string | null;
  /** Ids answered this session plus those restored from the server. */
  answeredQuestionIds: string[];
  /** Verdict for the question just answered, shown before playback resumes. */
  lastResult: { questionId: string; isCorrect: boolean; explanation: string } | null;
  /** Drives the "Saving…" / "Saved" indicator next to the progress bar. */
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
    /** Called when the player loads a video, seeding answers already on record. */
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

    /** Dismisses the verdict card and lets playback continue. */
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
