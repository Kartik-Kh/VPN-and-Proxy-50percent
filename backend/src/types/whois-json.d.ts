declare module 'whois-json' {
  interface WhoisData {
    [key: string]: any;
  }

  function whois(query: string): Promise<WhoisData>;
  
  export = whois;
}