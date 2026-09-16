import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

const BITCOIN_PATH =
  "M18.9 15.3c1.5-.8 2.4-2 2.1-3.7-.5-2.2-2.4-2.8-4.8-3.1V5.8h-1.8v2.6c-.5 0-1 0-1.5.1V5.8h-1.8v2.7c-.4 0-.8.1-1.7.1H7.8l.3 2.1s1.1 0 1.2 0c.7 0 .9.4.9.8v6.7c0 .2 0 .4-.2.5-.1 0-1.2 0-1.2 0l-.4 2.2h1.7c.4 0 .9 0 1.3.1v2.7h1.8v-2.6c.5 0 1 0 1.5.1v2.5h1.8v-2.7c3.1-.2 5.3-.9 5.6-3.7.2-1.8-.7-2.9-2.2-3.5zM13.2 10c1.5-.1 3.6-.2 3.6 1.5 0 1.6-1.9 1.6-3.6 1.6V10zm0 8.9v-3.5c1.9 0 4.2-.1 4.2 1.8 0 1.8-2.1 1.8-4.2 1.7z";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7931A",
          borderRadius: 40,
        }}
      >
        <svg width="110" height="110" viewBox="0 0 32 32">
          <path fill="#0B0B0B" d={BITCOIN_PATH} />
        </svg>
      </div>
    ),
    {
      ...size,
    },
  );
}
