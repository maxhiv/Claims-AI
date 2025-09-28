// Address verification provider interfaces

export interface AddressVerificationRequest {
  /** Raw address string to verify */
  address: string;
  /** Optional city */
  city?: string;
  /** Optional state/province */
  state?: string;
  /** Optional postal code */
  postalCode?: string;
  /** Optional country code (ISO 2-letter) */
  country?: string;
}

export interface AddressVerificationResponse {
  /** Whether the verification was successful */
  success: boolean;
  /** Verification confidence score (0-1) */
  confidence: number;
  /** Whether the address is deliverable */
  deliverable: boolean;
  /** Standardized address components */
  standardized?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  /** Address validation details */
  validation?: {
    isValid: boolean;
    isPrimaryNumber: boolean;
    isStreetName: boolean;
    isPostalCode: boolean;
    suggestions?: string[];
  };
  /** Raw provider response for debugging */
  metadata?: Record<string, any>;
  /** Error message if verification failed */
  error?: string;
}

export interface AddressSuggestion {
  /** Suggested address string */
  address: string;
  /** Confidence score for this suggestion */
  confidence: number;
  /** Whether this address is deliverable */
  deliverable: boolean;
}

export interface AddressSuggestionsRequest {
  /** Partial address to get suggestions for */
  query: string;
  /** Maximum number of suggestions to return */
  maxResults?: number;
  /** Country code to filter suggestions */
  country?: string;
}

export interface AddressSuggestionsResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Array of address suggestions */
  suggestions: AddressSuggestion[];
  /** Error message if request failed */
  error?: string;
}

export interface AddressVerificationProvider {
  /** Verify and standardize a single address */
  verifyAddress(request: AddressVerificationRequest): Promise<AddressVerificationResponse>;
  
  /** Get address suggestions for autocomplete */
  getSuggestions(request: AddressSuggestionsRequest): Promise<AddressSuggestionsResponse>;
  
  /** Provider name for identification */
  readonly name: string;
}