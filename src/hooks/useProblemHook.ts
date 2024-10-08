import { useCallback } from "react";
import { useIsClient, useLocalStorage } from "usehooks-ts";

type SimpleState = {
  name: string;
  finished: boolean;
};
type SimpleAction = { type: "edit"; value: string } | { type: "finish" };

export function useProblemHook(route: string) {
  const key = `test-${route}-key`;
  const [state, dispatch] = useLocalStorageReducer(
    key,
    simpleReducer,
    { name: "", finished: false },
    [],
    [],
    // FIXME: removing this will fix the other issues (below) but causes hydration errors
    { initializeWithValue: false },
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

  // FIXME: this will cause the 2 forms to step on each other's state (stale state)
  return [isClient ? initialState : state, dispatchWithMiddleware];
  // FIXME: this will cause no initial state to be shown
  // return [state, dispatchWithMiddleware];
};
