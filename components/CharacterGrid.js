const DEFAULT_CHARACTERS = [
  { id: "migu", name: "MIGU" },
  { id: "liya", name: "LIYA" },
  { id: "pied-piper", name: "PIED PIPER" },
  { id: "glucco-teddy", name: "GLUCCO TEDDY" }
];

export default function CharacterGrid({ selectedId, onSelect, characters = DEFAULT_CHARACTERS }) {
  return (
    <div className="px-6 pb-6">
      <div className="grid grid-cols-2 gap-4">
        {characters.map((c) => {
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={[
                "rounded-2xl border-2 p-4 text-center transition",
                active ? "border-sky-500 bg-sky-50" : "border-slate-300 bg-white hover:bg-slate-50"
              ].join(" ")}
              type="button"
            >
              <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-slate-200" />
              <div className="text-sm font-extrabold tracking-wide">{c.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
