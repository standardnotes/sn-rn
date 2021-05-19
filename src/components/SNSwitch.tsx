import React, { useContext } from 'react';
import { Platform, Switch, SwitchProps } from 'react-native';
import { ThemeContext } from 'styled-components';

export type SNSwitchProps = Omit<SwitchProps, 'trackColor'>;

export const SNSwitch: React.FC<SNSwitchProps> = props => {
  const theme = useContext(ThemeContext);
  return (
    <Switch
      trackColor={
        Platform.OS === 'ios'
          ? {
              false: theme.stylekitNeutralColor,
              true: theme.stylekitInfoColor,
            }
          : undefined
      }
      {...props}
    />
  );
};
