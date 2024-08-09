type QuizProps = {
  name: string;
  onChangeName: (name: string) => void;
  onFinish: () => void;
};

export function Quiz({ name, onChangeName, onFinish }: QuizProps) {
  return (
    <div className="space-y-4">
      <input
        type="text"
        id="name"
        name="name"
        className="border border-1"
        value={name}
        onChange={(e) => onChangeName(e.target.value)}
      />
      <button onClick={onFinish}>Finished</button>
    </div>
  );
}
