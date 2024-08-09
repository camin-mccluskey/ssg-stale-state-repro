import { useCallback, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { type Dispatch, type Reducer, useReducer } from "react";

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
    [console.log],
    [console.log],
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
      return { ...state, finished: !state.finished };
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
  const [reducedState, dispatch] = useReducerWithMiddleware(
    reducer,
    savedState,
    middlewareFns,
    afterwareFns,
  );

  useEffect(() => {
    setSavedState(reducedState);
  }, [reducedState, setSavedState]);

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
