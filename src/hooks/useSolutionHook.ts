import { useCallback, useEffect } from "react";
import { useLocalStorage, useReadLocalStorage } from "usehooks-ts";
import { type Dispatch, type Reducer, useReducer } from "react";

type SimpleState = {
  name: string;
  finished: boolean;
};
type SimpleAction<S> =
  | { type: "sync"; value: S }
  | { type: "edit"; value: string }
  | { type: "finish" };

export function useSolutionHook(route: string) {
  const key = `test-${route}-key`;
  const [state, dispatch] = useLocalStorageReducer(
    key,
    simpleReducer,
    { name: "", finished: false },
    [console.log],
    [console.log],
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

const simpleReducer = <S>(state: SimpleState, action: SimpleAction<S>) => {
  const { type } = action;
  switch (type) {
    case "edit":
      return { ...state, name: action.value };
    case "finish":
      return { ...state, finished: !state.finished };
    case "sync":
      return action.value;
    default:
      return type satisfies never;
  }
};

type Action<S> = { type: "sync"; value: S };

const useLocalStorageReducer = <S, A extends Action<S>>(
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

  const localStorageReducer = useCallback(
    (state: S, action: A) => {
      const newState = reducer(state, action);
      if (action.type !== "sync") {
        setSavedState(newState);
      }
      return newState;
    },
    [reducer, setSavedState],
  );

  const [reducedState, dispatch] = useReducerWithMiddleware(
    localStorageReducer,
    savedState,
    middlewareFns,
    afterwareFns,
  );

  // resync the reducer state with savedState
  useEffect(() => {
    dispatch({ type: "sync", value: savedState });
  }, [savedState, dispatch]);

  console.log("saved state (LS):", savedState);
  console.log("reduced state:", reducedState);
  // console.log("local state:", localState);

  return [savedState, dispatch] as const;
};

export type ReducerMiddlewareFn<S, A> = (action: A, state?: S) => void;
export const useReducerWithMiddleware = <S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  middlewareFns: Array<ReducerMiddlewareFn<S, A>>,
  afterwareFns: Array<ReducerMiddlewareFn<S, A>>,
): [S, Dispatch<A>] => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const dispatchWithMiddleware = useCallback(
    (action: A) => {
      middlewareFns.forEach((middlewareFn) => middlewareFn(action, state));
      dispatch(action);
      afterwareFns.forEach((afterwareFn) => afterwareFn(action, state));
    },
    [middlewareFns, afterwareFns, state],
  );

  return [state, dispatchWithMiddleware];
};
