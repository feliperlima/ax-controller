import type { ReactNode } from "react";

type FixedMasterBusProps = {
  children: ReactNode;
};

export function FixedMasterBus({ children }: FixedMasterBusProps) {
  return <aside className="mixer-tabs-layout__master">{children}</aside>;
}