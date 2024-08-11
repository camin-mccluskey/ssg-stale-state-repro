import { useCallback, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { type Dispatch, type Reducer, useReducer } from "react";

// NOTE: client provided State and Actions
type SimpleState = {
  name: string;
  finished: boolean;
};
type SimpleAction = { type: "edit"; value: string } | { type: "finish" };

const simpleReducer = (state: SimpleState, action: SimpleAction) => {
  const { type } = action;
  switch (type) {
    case "edit":
      return { ...state, name: action.value };
    case "finish":
      return { ...state, finished: !state.finished };
    // case "sync":
    //   return action.value;
    default:
      return type satisfies never;
  }
};

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

// NOTE: lib provided
type SyncAction<S> = { type: "sync"; payload: S };
const useLocalStorageReducer = <S, A extends Object>(
  key: string,
  reducer: Reducer<S, A>,
  initialState: S | (() => S),
  middlewareFns: Array<ReducerMiddlewareFn<S, A>> = [],
  afterwareFns: Array<ReducerMiddlewareFn<S, A>> = [],
  options?: {
    // TODO: may want to provide customer serializer/deserializer here
    initializeWithValue?: boolean;
  },
) => {
  const [savedState, setSavedState] = useLocalStorage<S>(
    key,
    initialState,
    options,
  );

  const localStorageReducer = useCallback(
    (state: S, action: A | SyncAction<S>) => {
      if ("type" in action && action.type === "sync") {
        return action.payload;
      }
      const newState = reducer(state, action as A);
      setSavedState(newState);
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
    dispatch({ type: "sync", payload: savedState });
  }, [savedState, dispatch]);

  console.log("saved state (LS):", savedState);
  console.log("reduced state:", reducedState);
  // console.log("local state:", localState);

  return [savedState, dispatch] as const;
};

export type ReducerMiddlewareFn<S, A> = (
  action: A | SyncAction<S>,
  state?: S,
) => void;
export const useReducerWithMiddleware = <S, A>(
  // TODO: creae a type like Reducer for this
  reducer: (state: S, action: A | SyncAction<S>) => S,
  initialState: S,
  middlewareFns: Array<ReducerMiddlewareFn<S, A>>,
  afterwareFns: Array<ReducerMiddlewareFn<S, A>>,
) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const dispatchWithMiddleware = useCallback(
    (action: A | SyncAction<S>) => {
      middlewareFns.forEach((middlewareFn) => middlewareFn(action, state));
      dispatch(action);
      afterwareFns.forEach((afterwareFn) => afterwareFn(action, state));
    },
    [middlewareFns, afterwareFns, state],
  );

  return [state, dispatchWithMiddleware] as const;
};
