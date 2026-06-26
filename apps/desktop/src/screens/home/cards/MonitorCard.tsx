import { Headphones } from "lucide-react";
import { Card, IconTile, Button } from "../../../design-system/components";

type MonitorCardProps = {
  onAction?: () => void;
};

/** Card "Monitor Pessoal" (IEM). Figma `IemCard` → `.home-action-card`. */
export function MonitorCard({ onAction }: MonitorCardProps) {
  return (
    <Card glow="iem" className="home-action-card">
      <div className="home-action-card__content">
        <IconTile color="purple"><Headphones size={20} /></IconTile>
        <div className="home-action-card__titlearea">
          <h3 className="home-action-card__title">Monitor Pessoal</h3>
          <p className="home-action-card__desc">
            Crie uma sessão para músicos controlarem seus auxiliares.
          </p>
        </div>
      </div>
      <Button variant="ghost" accent="purple" block onClick={onAction}>
        Criar sessão
      </Button>
    </Card>
  );
}
