import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const socials = searchParams.get("socials");
  if (!name || !socials) {
    throw new Error("Invalid request");
  }

  // Split the socials string into an array
  const socialsArray = socials.split(",");

  interface SocialIcons {
    [key: string]: Promise<string>;
  }
  // Fetch and encode SVG content for each social media
  const socialIcons: SocialIcons = {
    email: fetch(new URL("./email.svg", import.meta.url)).then((res) =>
      res.text(),
    ),
    twitter: fetch(new URL("./twitter_x.svg", import.meta.url)).then((res) =>
      res.text(),
    ),
    telegram: fetch(new URL("./telegram.svg", import.meta.url)).then((res) =>
      res.text(),
    ),
    instagram: fetch(new URL("./instagram.svg", import.meta.url)).then((res) =>
      res.text(),
    ),
    github: fetch(new URL("./github.svg", import.meta.url)).then((res) =>
      res.text(),
    ),
    website: fetch(new URL("./website.svg", import.meta.url)).then((res) =>
      res.text(),
    ),
    youtube: fetch(new URL("./youtube.svg", import.meta.url)).then((res) =>
      res.text(),
    ),
  };

  const fetchedSocialIcons = await Promise.all(Object.values(socialIcons));
  const keys = Object.keys(socialIcons);

  // Reduce with type annotation for the accumulator
  const socialImages: { [key: string]: string } = keys.reduce(
    (acc: { [key: string]: string }, key, index) => {
      if (socialsArray.includes(key)) {
        acc[key] =
          `data:image/svg+xml,${encodeURIComponent(fetchedSocialIcons[index])}`;
      }
      return acc;
    },
    {},
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
          color: "#4B5563",
          width: "100%",
          height: "100%",
          padding: "20px",
          boxSizing: "border-box",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{ fontSize: "80px", fontWeight: "bold", marginBottom: "12px" }}
        >
          {name}
        </div>
        <hr
          style={{
            width: "60%",
            height: "2px",
            backgroundColor: "#D1D5DB",
            margin: "12px 0 24px 0",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
            margin: "24px 0",
          }}
        >
          {Object.entries(socialImages).map(([key, src]) => (
            <img key={key} width="56" height="56" src={src} alt={key} />
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
