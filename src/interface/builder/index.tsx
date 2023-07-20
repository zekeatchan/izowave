import React, { useContext, useEffect, useState } from 'react';

import { ComponentBuilderInfo } from '~interface/builder/info';
import { ComponentBuilderPreview } from '~interface/builder/preview';
import { ComponentHint } from '~interface/plates/hint';
import { GameContext, useWorldUpdate } from '~lib/interface';
import { TutorialStep } from '~type/tutorial';
import { BuildingVariant } from '~type/world/entities/building';

import { Variant, Info, Wrapper } from './styles';

export const ComponentBuilder: React.FC = () => {
  const game = useContext(GameContext);

  const [hint, setHint] = useState<{
    variant: BuildingVariant
    text: string
  }>(null);

  const hideHint = () => {
    setHint(null);
  };

  return (
    <Wrapper>
      {Object.values(BuildingVariant).map((variant, index) => (
        <Variant key={variant}>
          {(hint?.variant === variant) && (
            <ComponentHint side="right">
              {hint.text}
            </ComponentHint>
          )}

          {(
            <Info>
              <ComponentBuilderInfo variant={variant} />
            </Info>
          )}

          {index < 2 && (
            <ComponentBuilderPreview
              variant={variant}
              number={index + 1}
              isDisabled={false}
            />)}
        </Variant>
      ))}
    </Wrapper>
  );
};

ComponentBuilder.displayName = 'ComponentBuilder';
