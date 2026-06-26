import { Sparkles } from "lucide-react";
import { Card, IconTile, Button } from "../../../design-system/components";

type DemoCardProps = {
  onDemo?: () => void;
};

/** Card "Demonstração". Figma `DemoCard` → `.home-action-card`. */
export function DemoCard({ onDemo }: DemoCardProps) {
  return (
    <Card glow="demo" className="home-action-card">
      <div className="home-action-card__content">
        <IconTile color="green"><Sparkles size={20} /></IconTile>
        <div className="home-action-card__titlearea">
          <h3 className="home-action-card__title">Demonstração</h3>
          <p className="home-action-card__desc">
            Teste os recursos do app sem precisar de uma mesa.
          </p>
        </div>
      </div>
      <Button variant="ghost" accent="green" block onClick={onDemo} disabled={!onDemo}>
        Modo Demo
      </Button>
    </Card>
  );
}
