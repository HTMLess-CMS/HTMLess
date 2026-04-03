// ─── Lightweight GraphQL-subset query parser ───
//
// Parses queries like:
//   { entries(type: "article", limit: 10) { id slug data } }
//   { entry(type: "article", slug: "hello") { id slug data } }
//   { types { key name fields { key type required } } }
//   { assets(limit: 10) { id filename mimeType url } }

export interface ParsedField {
  name: string;
  subFields?: ParsedField[];
}

export interface ParsedOperation {
  name: string;
  args: Record<string, string | number | boolean>;
  fields: ParsedField[];
}

export interface ParsedQuery {
  operations: ParsedOperation[];
}

class QueryLexer {
  private pos = 0;
  constructor(private readonly input: string) {}

  peek(): string {
    this.skipWhitespace();
    return this.input[this.pos] ?? '';
  }

  advance(): string {
    this.skipWhitespace();
    return this.input[this.pos++] ?? '';
  }

  expect(ch: string): void {
    const got = this.advance();
    if (got !== ch) {
      throw new Error(`Expected '${ch}' but got '${got}' at position ${this.pos - 1}`);
    }
  }

  readIdentifier(): string {
    this.skipWhitespace();
    const start = this.pos;
    while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos]!)) {
      this.pos++;
    }
    const ident = this.input.slice(start, this.pos);
    if (!ident) {
      throw new Error(`Expected identifier at position ${this.pos}`);
    }
    return ident;
  }

  readString(): string {
    this.skipWhitespace();
    const quote = this.advance(); // consume opening quote
    if (quote !== '"' && quote !== "'") {
      throw new Error(`Expected string at position ${this.pos - 1}`);
    }
    const start = this.pos;
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      this.pos++;
    }
    const value = this.input.slice(start, this.pos);
    this.pos++; // consume closing quote
    return value;
  }

  readValue(): string | number | boolean {
    this.skipWhitespace();
    const ch = this.input[this.pos] ?? '';
    if (ch === '"' || ch === "'") {
      return this.readString();
    }
    // number or boolean
    const start = this.pos;
    while (this.pos < this.input.length && /[a-zA-Z0-9._-]/.test(this.input[this.pos]!)) {
      this.pos++;
    }
    const raw = this.input.slice(start, this.pos);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    const num = Number(raw);
    if (!isNaN(num)) return num;
    return raw;
  }

  eof(): boolean {
    this.skipWhitespace();
    return this.pos >= this.input.length;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) {
      this.pos++;
    }
  }
}

function parseArgs(lexer: QueryLexer): Record<string, string | number | boolean> {
  const args: Record<string, string | number | boolean> = {};
  lexer.expect('(');
  while (lexer.peek() !== ')') {
    const key = lexer.readIdentifier();
    lexer.expect(':');
    const value = lexer.readValue();
    args[key] = value;
    if (lexer.peek() === ',') {
      lexer.advance(); // consume comma
    }
  }
  lexer.expect(')');
  return args;
}

function parseFields(lexer: QueryLexer): ParsedField[] {
  const fields: ParsedField[] = [];
  lexer.expect('{');
  while (lexer.peek() !== '}') {
    const name = lexer.readIdentifier();
    let subFields: ParsedField[] | undefined;
    if (lexer.peek() === '{') {
      subFields = parseFields(lexer);
    }
    fields.push({ name, subFields });
  }
  lexer.expect('}');
  return fields;
}

function parseOperation(lexer: QueryLexer): ParsedOperation {
  const name = lexer.readIdentifier();
  let args: Record<string, string | number | boolean> = {};
  if (lexer.peek() === '(') {
    args = parseArgs(lexer);
  }
  const fields = parseFields(lexer);
  return { name, args, fields };
}

export function parseQuery(query: string): ParsedQuery {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Empty query');
  }

  const lexer = new QueryLexer(trimmed);
  lexer.expect('{');

  const operations: ParsedOperation[] = [];
  while (lexer.peek() !== '}') {
    operations.push(parseOperation(lexer));
  }
  lexer.expect('}');

  if (operations.length === 0) {
    throw new Error('Query must contain at least one operation');
  }

  return { operations };
}
