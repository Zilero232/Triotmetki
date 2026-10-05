export const PRESET_ADVISOR = {
  payloadVersion: 1,
  model: {
    property: 'otmetkiPresetAdvisor',
    payload: 'payload',
    tankSetup: 'tankSetup',
    setups: ['optDevicesSetup', 'battleBoostersSetup', 'consumablesSetup'],
    slots: 'slots',
    intCD: 'intCD',
    imageName: 'imageName'
  },
  dom: {
    markAttribute: 'data-otmetki-advised',
    positionedAttribute: 'data-otmetki-advised-positioned',
    badgeClass: 'otmetki-advised-badge',
    styleId: 'otmetki-preset-advisor-style',
    cardPattern: /slot|card|item|device|booster/i,
    maxCardDepth: 4,
    staticPosition: 'static',
    imageExtension: '.'
  },
  refreshMs: 1500
} as const;

export const PRESET_ADVISOR_STYLE = `
[${PRESET_ADVISOR.dom.markAttribute}] {
  box-shadow: inset 0 0 0 2rem #e8b84a, 0 0 10rem 0 rgba(232, 184, 74, 0.55);
}
.${PRESET_ADVISOR.dom.badgeClass} {
  position: absolute;
  top: 3rem;
  left: 3rem;
  z-index: 10;
  padding: 1rem 5rem;
  background-color: #e8b84a;
  color: #0e0e10;
  font-size: 11rem;
  font-weight: bold;
  line-height: 14rem;
  pointer-events: none;
}
`;
