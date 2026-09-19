export type Provider = "greenhouse" | "lever" | "ashby";

/** Normalized open requisition, as published by the company's own ATS. */
export interface Role {
  id: string;
  title: string;
  location: string;
  department: string | null;
  url: string;
  provider: Provider;
}

export interface CompanyRoles {
  company: string;
  provider: Provider;
  /** The provider-specific board token / slug that worked. */
  token: string;
  roles: Role[];
  /** "live" = fetched just now; "cache" = served from the committed snapshot. */
  source: "live" | "cache";
  fetchedAt: string;
}
