/**
 * TypeScript types generated from the Supabase schema (001_schema.sql).
 * Keep in sync with migrations. Run `supabase gen types typescript` to regenerate.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Owner = 'katie' | 'stephen'
export type Network = 'amex' | 'chase' | 'citi' | 'ihg' | 'hilton' | 'marriott' | 'southwest'
export type PeriodType = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'cardmember_year' | 'ended'
export type CertStatus = 'pending' | 'active' | 'committed' | 'redeemed' | 'expired'
export type TripStatus = 'planning' | 'researching' | 'booked' | 'completed' | 'cancelled'
export type AllocationStatus = 'planned' | 'committed' | 'cancelled'
export type RateConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Card {
  id:                 string
  owner:              Owner
  network:            string
  issuer:             string
  display_name:       string
  last4:              string | null
  annual_fee_cents:   number
  fee_waived:         boolean
  anniversary_month:  number | null
  anniversary_day:    number | null
  active:             boolean
  created_at:         string
}

export interface Credit {
  id:                   string
  card_id:              string
  name:                 string
  amount_cents:         number
  period_type:          PeriodType
  ends_permanently:     string | null   // ISO date
  category:             string
  single_instance:      boolean
  is_primary_instance:  boolean
  pools_per_user:       boolean
  autopilot:            boolean
  active:               boolean
  created_at:           string
}

export interface UsageLog {
  id:                 string
  credit_id:          string
  period_key:         string
  amount_used_cents:  number
  notes:              string | null
  logged_at:          string
}

export interface Certificate {
  id:                string
  card_id:           string
  name:              string
  status:            CertStatus
  value_low_cents:   number | null
  value_high_cents:  number | null
  issued_at:         string | null
  expires_at:        string | null
  trip_id:           string | null
  notes:             string | null
  cert_type:         'one_time' | 'recurring'
  anniversary_month: number | null
  anniversary_day:   number | null
  first_issue_year:  number | null
  created_at:        string
}

export interface CertRedemption {
  id:             string
  certificate_id: string
  year:           number
  redeemed_at:    string
}

export interface Trip {
  id:                string
  title:             string
  destination:       string
  check_in:          string | null  // ISO date
  check_out:         string | null  // ISO date
  nights:            number | null
  travelers:         string | null
  status:            TripStatus
  target_cost_cents: number | null
  notes:             string | null
  created_at:        string
}

export interface TripShortlist {
  id:               string
  trip_id:          string
  hotel_name:       string
  hotel_library_id: string | null
  rank:             number | null
  notes:            string | null
  created_at:       string
}

export interface TripAllocation {
  id:             string
  trip_id:        string
  credit_id:      string | null
  certificate_id: string | null
  amount_cents:   number
  status:         AllocationStatus
  notes:          string | null
  created_at:     string
}

export interface HotelLibrary {
  id:                 string
  name:               string
  city:               string
  state:              string | null
  region:             string | null
  program_fhr:        boolean | null
  program_thc:        boolean | null
  program_edit:       boolean | null
  program_ihg:        boolean | null
  program_hilton:     boolean | null
  program_marriott:   boolean | null
  rate_low_cents:     number | null
  rate_high_cents:    number | null
  rate_source:        string | null
  rate_confidence:    RateConfidence | null
  last_verified_at:   string | null
  verification_notes: string | null
  active:             boolean
  created_at:         string
}

export interface RateCache {
  id:                  string
  hotel_name:          string
  hotel_library_id:    string | null
  trip_id:             string | null
  check_in:            string    // ISO date
  check_out:           string    // ISO date
  rate_low_cents:      number | null
  rate_high_cents:     number | null
  rate_confidence:     RateConfidence | null
  rate_source:         string | null
  amenity_total_cents: number | null
  amenity_breakdown:   string | null
  net_low_cents:       number | null
  net_high_cents:      number | null
  better_than_free:    boolean | null
  fhr_confirmed:       boolean | null
  thc_confirmed:       boolean | null
  edit_confirmed:      boolean | null
  researched_at:       string
  raw_json:            Json | null
  created_at:          string
}

export interface DiningLibrary {
  id:             string
  name:           string
  city:           string
  state:          string | null
  amex_opentable: boolean
  resy_eligible:  boolean
  chase_dining:   boolean
  notes:          string | null
  active:         boolean
  created_at:     string
}

export interface PinnedNote {
  id:         string
  title:      string
  body:       string
  card_id:    string | null
  pinned:     boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ── Supabase Database interface (for typed client) ────────────

export interface Database {
  public: {
    Tables: {
      cards:           { Row: Card;          Insert: Partial<Card>;          Update: Partial<Card>          }
      credits:         { Row: Credit;        Insert: Partial<Credit>;        Update: Partial<Credit>        }
      usage_log:       { Row: UsageLog;      Insert: Partial<UsageLog>;      Update: Partial<UsageLog>      }
      certificates:    { Row: Certificate;   Insert: Partial<Certificate>;   Update: Partial<Certificate>   }
      trips:           { Row: Trip;          Insert: Partial<Trip>;          Update: Partial<Trip>          }
      trip_shortlist:  { Row: TripShortlist; Insert: Partial<TripShortlist>; Update: Partial<TripShortlist> }
      trip_allocations:{ Row: TripAllocation;Insert: Partial<TripAllocation>;Update: Partial<TripAllocation>}
      hotel_library:   { Row: HotelLibrary;  Insert: Partial<HotelLibrary>;  Update: Partial<HotelLibrary>  }
      rate_cache:      { Row: RateCache;     Insert: Partial<RateCache>;     Update: Partial<RateCache>     }
      dining_library:  { Row: DiningLibrary; Insert: Partial<DiningLibrary>; Update: Partial<DiningLibrary> }
      pinned_notes:    { Row: PinnedNote;    Insert: Partial<PinnedNote>;    Update: Partial<PinnedNote>    }
    }
    Views:   Record<string, never>
    Functions: Record<string, never>
    Enums:   Record<string, never>
  }
}
