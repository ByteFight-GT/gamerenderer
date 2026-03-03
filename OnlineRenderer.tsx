import { getPublicGameMatchFile } from "@/api/bytefight";
import { useEffect, useState } from "react";
import { GameRenderer } from "./GameRenderer";

export const OnlineRenderer = ({ matchUuid, slug }: { matchUuid: string; slug: string }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getPublicGameMatchFile(matchUuid, slug).then(setData);
  }, [matchUuid, slug]);

  if (!data) return <div>Loading Match...</div>;

  return <GameRenderer initialData={data} />;
};