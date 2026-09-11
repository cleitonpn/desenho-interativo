/** Original vector scenery: imperfect rooflines, sparse hatching and warm paper. */
export function CenarioCorrida({
  camera,
  stage,
  width,
}: {
  camera: number;
  stage: number;
  width: number;
}) {
  return (
    <g aria-hidden="true">
      <defs>
        <pattern
          id="corrida-paper"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path d="M24 0H0V24" fill="none" stroke="#dbd3c5" strokeWidth=".45" />
        </pattern>
        <pattern
          id="corrida-ground"
          width="18"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path d="M-4 16L12 0M12 16L28 0" stroke="#b5a99a" strokeWidth="1" />
        </pattern>
      </defs>
      <rect
        width={width}
        height="650"
        fill={stage === 2 ? "#eee7dd" : "#faf6ed"}
      />
      <rect
        width={width}
        height="650"
        fill="url(#corrida-paper)"
        opacity=".4"
      />
      <g stroke="#b6a99a" strokeWidth="1.8" fill="none" strokeLinecap="round">
        <circle cx={width - 100} cy="105" r="33" />
        <path d={`M${width - 143} 105h-12m98 0h12m-55-45v-12m0 100v12`} />
        <path d="M60 122q12-9 24 0q12-9 24 0M220 86q8-8 16 0q8-8 16 0" />
      </g>
      {[0, 1, 2].map((tile) => (
        <g
          key={tile}
          transform={`translate(${tile * 800 - ((camera * 13) % 800)},0)`}
          stroke="#c3b6a4"
          fill="#f1eadf"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <path d="M0 485V302L55 259L109 298V359H145V238L193 211L248 242V321H280V282L337 239L398 282V350H430V207L485 173L539 207V322H578V252L630 211L686 255V334H721V298L764 266L800 299V485Z" />
          <path d="M159 249h20v27h-20zm39 0h20v27h-20zM451 230h22v32h-22zm40 0h22v32h-22zM303 299h20v28h-20zm39 0h20v28h-20z" />
          <path
            d="M484 174v-47m-24 8h48m-35-13h22M49 262v-37h12v42M633 213v-29m-15 7h31"
            fill="none"
          />
        </g>
      ))}
      {[0, 1, 2].map((tile) => (
        <g
          key={tile}
          transform={`translate(${tile * 700 - ((camera * 26) % 700)},0)`}
          stroke="#8e8172"
          strokeWidth="2.2"
          fill="#faf6ed"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {stage === 0 ? (
            <>
              <path
                d="M0 501V407l11-15 11 15v94m15 0v-94l11-15 11 15v94m15 0v-94l11-15 11 15v94M0 436h210m-210 33h210"
                fill="none"
              />
              <path d="M264 500v-110m0 46q-52-14-35-39q34 0 35 39m1 26q46-6 37-35q-30 0-37 35M240 500l-8-31h64l-8 31" />
              <path
                d="M361 500V328m263 172V328m-263 20q130 28 263 0"
                fill="none"
              />
              <path d="M390 359l12-12 15 5 15-2 12 15-10 10-6-6-4 40-30-4 2-40-6 5-10-11zM487 365l18-10 24 1 17 11-7 16-12-7-2 39-25-1-1-39-12 8z" />
            </>
          ) : stage === 1 ? (
            <>
              <path d="M22 500V306l76-45 77 45v194M11 309h175M49 500V398h44v102m28-143h31v40h-31z" />
              <path
                d="M242 500V284m-24 0h48m-31 0v-38h27v38m-40 67h46"
                fill="none"
              />
              <path d="M330 500V336h185v164M320 336l16-35h169l20 35zM356 500V421h52v79m31-115h49v43h-49z" />
              <path d="M577 500v-53h70v53m-79-55h89m-72-17h63" fill="none" />
            </>
          ) : (
            <>
              <path d="M25 501V298h202v203M16 297l20-22h181l21 22zM56 500V381h57v119m36-138h47v59h-47z" />
              <rect x="48" y="318" width="155" height="35" rx="3" />
              <text
                x="125"
                y="341"
                textAnchor="middle"
                fontSize="15"
                fill="#8e8172"
                stroke="none"
                fontFamily="monospace"
              >
                ESTÚDIO VITAL
              </text>
              <path
                d="M325 500v-70h71v70m-79-70h88m-58 0v-78l13-19 9 20-8 77m-32 0-12-58 10-4 14 62M500 500V353h119v147m-121-123h119m-119 34h119m-100 35h80"
                fill="none"
              />
            </>
          )}
        </g>
      ))}
      <path
        d={`M0 532Q${width / 3} 529 ${width} 532V650H0Z`}
        fill="#e7ddcb"
        stroke="#443c33"
        strokeWidth="2.5"
      />
      <rect
        y="535"
        width={width}
        height="115"
        fill="url(#corrida-ground)"
        opacity=".35"
      />
    </g>
  );
}
