import styled, { keyframes } from 'styled-components';

import { InterfaceFont, InterfaceColor } from '~type/interface';
import { NoticeType } from '~type/screen';

const animationOpacity = keyframes`
  0% { opacity: 0; margin-top: -30px }
  100% { opacity: 1; margin-top: 0 }
`;

export const Wrapper = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const Item = styled.div`
  padding: 8px 15px 10px 15px;
  color: #fff;
  font-family: ${InterfaceFont.PIXEL};
  font-size: 16px;
  line-height: 16px;
  text-shadow: 2px 2px 0 #000;
  border-bottom: 2px solid #000;
  animation: ${animationOpacity} 0.2s ease-in;
  &:not(:last-child) {
    margin-bottom: 8px;
  }
  &.${NoticeType.INFO} {
    background: ${InterfaceColor.INFO_DARK};
  }
  &.${NoticeType.WARN} {
    background: ${InterfaceColor.WARN_DARK};
  }
  &.${NoticeType.ERROR} {
    background: ${InterfaceColor.ERROR_DARK};
  }
`;
