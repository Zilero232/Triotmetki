import type { XmlNode } from '../../xml/xml.types';

export type ParseCrewInput = {
  tankmenXml: string;
  perksXml?: string;
};

export type CollectParamsInput = {
  skill: XmlNode;
  perkArgs: Record<string, number> | undefined;
};
