import { useCallback } from "react";
import { useIsClient, useLocalStorage } from "usehooks-ts";

type SimpleState = {
  name: string;
  finished: boolean;
};
type SimpleAction = { type: "edit"; value: string } | { type: "finish" };

export function useSolutionHook(route: string) {
  const key = `test-${route}-key`;
  const [state, dispatch] = useLocalStorageReducer(
    key,
    simpleReducer,
    { name: "", finished: false },
    [],
    [],
    // NOTE: this must be true rather than false
    { initializeWithValue: true },
  );

  const onAnswer = useCallback(
    (answer: string) => dispatch({ type: "edit", value: answer }),
    [dispatch],
  );

  const onFinish = useCallback(() => dispatch({ type: "finish" }), [dispatch]);

  return {
    name: state.name,
    onChangeName: onAnswer,
    onFinish,
  };
}

const simpleReducer = (state: SimpleState, action: SimpleAction) => {
  const { type } = action;
  switch (type) {
    case "edit":
      return { ...state, name: action.value };
    case "finish":
      return { ...state, finished: true };
    default:
      return type satisfies never;
  }
};

const useLocalStorageReducer = <S, A>(
  key: string,
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
  middlewareFns: Array<ReducerMiddlewareFn<S, A>> = [],
  afterwareFns: Array<ReducerMiddlewareFn<S, A>> = [],
  options?: {
    initializeWithValue?: boolean;
  },
) => {
  const [savedState, setSavedState] = useLocalStorage<S>(
    key,
    initialState,
    options,
  );

  const reducerWithLocalStorage = useCallback(
    (state: S, action: A) => {
      const newState = reducer(state, action);
      setSavedState(newState);
      return newState;
    },
    [reducer, setSavedState],
  );
  return useReducerWithMiddleware(
    reducerWithLocalStorage,
    savedState,
    middlewareFns,
    afterwareFns,
  );
};

import { type Dispatch, type Reducer, useReducer } from "react";
// import { useIsClient } from 'usehooks-ts'

export type ReducerMiddlewareFn<S, A> = (action: A, state?: S) => void;

export const useReducerWithMiddleware = <S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  middlewareFns: Array<ReducerMiddlewareFn<S, A>>,
  afterwareFns: Array<ReducerMiddlewareFn<S, A>>,
): [S, Dispatch<A>] => {
  const isClient = useIsClient();
  const [state, dispatch] = useReducer(reducer, initialState);

  const dispatchWithMiddleware = useCallback(
    (action: A) => {
      middlewareFns.forEach((middlewareFn) => middlewareFn(action, state));
      dispatch(action);
      afterwareFns.forEach((afterwareFn) => afterwareFn(action, state));
    },
    [middlewareFns, afterwareFns, state],
  );

  // NOTE: The "initialState" is always actually the fresh state, the state from the reducer is stale
  // We still need the dispatch function from the reducer though
  // What we'll want to do is come up with better naming conventions and probably combine this function with the
  // localStorage wrapper func
  return [initialState, dispatchWithMiddleware];
};
