import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { TitleIntro, titleIntroSchema } from "./TitleIntro";

// Every composition you want to render or preview must be registered here.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Hello, Remotion",
          subtitle: "Videos made with React",
        }}
      />
      <Composition
        id="TitleIntro"
        component={TitleIntro}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        schema={titleIntroSchema}
        defaultProps={{
          title: "Town Scholar",
          subtitle: "Learn. Build. Ship.",
          accentColor: "#4f8cff",
          backgroundColor: "#0b1020",
        }}
      />
    </>
  );
};
