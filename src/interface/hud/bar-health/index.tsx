import React, { useContext, useState } from 'react';

import { GameContext, useWorldUpdate } from '~lib/interface';

import { ComponentBar } from '../bar';

export const ComponentBarHealth: React.FC = () => {
  const game = useContext(GameContext);

  const [health, setHealth] = useState(0);
  const [maxHealth, setMaxHealth] = useState(0);

  useWorldUpdate(() => {
    setHealth(game.world.player.live.health);
    setMaxHealth(game.world.player.live.maxHealth);
  });

  return (
    <ComponentBar percent={health / maxHealth} color='#41a6f6'>
      {`${health} HP`}
    </ComponentBar>
  );
};

ComponentBarHealth.displayName = 'ComponentBarHealth';
