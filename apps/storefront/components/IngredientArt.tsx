/** Small vector ingredients stay crisp while swirling into the press. */
export function IngredientArt({ name }: { name: string }) {
  const ingredient = name.toLowerCase();
  let art;
  if (/kale|mint/.test(ingredient)) {
    art = (
      <>
        <path
          d="M30 53C7 48 6 33 14 29 2 18 18 8 26 15 31 0 44 6 43 17 59 13 63 29 50 34 60 46 46 55 34 49"
          fill="#548347"
        />
        <path
          d="m30 57 4-38m-2 19L20 28m12 10 14-13m-14 20-12-6"
          fill="none"
          stroke="#c2d599"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    );
  } else if (/cucumber/.test(ingredient)) {
    art = (
      <>
        <ellipse cx="39" cy="26" rx="18" ry="19" fill="#59843d" />
        <ellipse cx="39" cy="26" rx="14" ry="15" fill="#d0e5a4" />
        <circle cx="25" cy="39" r="19" fill="#51843a" />
        <circle cx="25" cy="39" r="15" fill="#e1edbc" />
        {[
          [23, 31],
          [31, 37],
          [22, 45],
          [17, 37],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="2" ry="3" fill="#9ebc73" />
        ))}
      </>
    );
  } else if (/lemon|lime|orange/.test(ingredient)) {
    const color = /orange/.test(ingredient)
      ? "#ec9c35"
      : /lime/.test(ingredient)
        ? "#94b648"
        : "#e8c349";
    art = (
      <>
        <circle cx="32" cy="32" r="25" fill={color} />
        <circle cx="32" cy="32" r="21" fill="#fff5cf" />
        <circle cx="32" cy="32" r="18" fill={color} />
        {[0, 60, 120].map((a) => (
          <path
            key={a}
            d="M32 13v38"
            stroke="#fff5cf"
            strokeWidth="2"
            transform={`rotate(${a} 32 32)`}
          />
        ))}
        <circle cx="32" cy="32" r="3" fill="#fff5cf" />
      </>
    );
  } else if (/apple/.test(ingredient)) {
    art = (
      <>
        <path
          d="M32 21c-24-18-34 15-15 33 7 6 12 0 15 0s9 6 15-1C65 34 55 4 32 21"
          fill={/green/.test(ingredient) ? "#90b54c" : "#cf5b41"}
        />
        <path
          d="M32 22q-3-10 4-15"
          stroke="#766047"
          strokeWidth="3"
          fill="none"
        />
        <path d="M35 15q7-15 20-7-6 12-20 7" fill="#527f3d" />
        <path
          d="M17 29q-5 9 1 15"
          stroke="#fff"
          strokeOpacity=".5"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  } else if (/beet/.test(ingredient)) {
    art = (
      <>
        <path
          d="m31 26-7-18m10 17 9-17"
          stroke="#50813e"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M32 21C4 14 8 50 31 56l-1 6 9-10C61 39 56 15 32 21"
          fill="#a03d63"
        />
        <path
          d="M19 32q-4 9 7 15"
          stroke="#d9819d"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  } else if (/carrot/.test(ingredient)) {
    art = (
      <>
        <path
          d="M43 22q5-14 0-16m3 17q13-10 12-17"
          stroke="#50813e"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M37 18C21 26 16 45 9 58c20-4 38-20 43-31q-4-11-15-9"
          fill="#e59139"
        />
        <path
          d="m33 26 8 5m-18 4 7 4m-12 5 5 3"
          stroke="#f7c577"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </>
    );
  } else if (/ginger/.test(ingredient)) {
    art = (
      <>
        <path
          d="m15 49 9-17-5-13q0-8 8-8 7 0 8 8l1 7 10-9q9-6 12 1 3 7-3 12L41 40l-4 14q-4 10-12 5l-2-8q-13 11-15 1Z"
          fill="#d4b17a"
        />
        <path
          d="m23 35 10 4m2-13 5 8m-15 12 9 3"
          stroke="#ae895b"
          strokeWidth="2"
        />
      </>
    );
  } else {
    art = (
      <>
        {[
          [22, 23],
          [40, 22],
          [16, 39],
          [33, 36],
          [47, 39],
          [31, 51],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r="10"
              fill={i % 2 ? "#7f4569" : "#a44067"}
            />
            <circle
              cx={(cx ?? 0) - 2}
              cy={(cy ?? 0) - 3}
              r="2.5"
              fill="#d99bb4"
              opacity=".7"
            />
          </g>
        ))}
        <path d="M31 15q-8-14 9-10 5 8-9 10" fill="#528146" />
      </>
    );
  }
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      {art}
    </svg>
  );
}
