import { describe, expect, it } from 'vitest';
import { PROVIDERS, getProviderPreset, parseModelList, resolveProvider, toJsonSchema, validateBaseUrl } from './providers';
import { PROCESS_MODEL_SCHEMA } from './copilot/prompts';

describe('providers', () => {
  it('fällt bei unbekanntem Anbieter auf Gemini zurück', () => {
    expect(getProviderPreset('gibt-es-nicht').id).toBe('gemini');
    expect(new Set(PROVIDERS.map((p) => p.id)).size).toBe(PROVIDERS.length);
  });

  it('liest Modelllisten mit Komma oder Zeilenumbruch', () => {
    expect(parseModelList(' a, b\nc ,, ')).toEqual(['a', 'b', 'c']);
    expect(parseModelList(undefined)).toEqual([]);
  });

  it('erlaubt nur HTTPS und lokales HTTP als Server-Adresse', () => {
    expect(validateBaseUrl('https://ki.example.de/v1/')).toEqual({ ok: true, url: 'https://ki.example.de/v1' });
    expect(validateBaseUrl('http://localhost:11434/v1').ok).toBe(true);
    expect(validateBaseUrl('http://ki.example.de/v1').ok).toBe(false);
    expect(validateBaseUrl('https://nutzer:pass@ki.example.de').ok).toBe(false);
    expect(validateBaseUrl('https://ki.example.de/v1?key=1').ok).toBe(false);
    expect(validateBaseUrl('kein url').ok).toBe(false);
    expect(validateBaseUrl('').ok).toBe(false);
  });

  it('nutzt die Voreinstellung, solange keine eigenen Modelle eingetragen sind', () => {
    expect(resolveProvider({ providerId: 'mistral' }).models).toEqual(getProviderPreset('mistral').models);
    expect(resolveProvider({ providerId: 'mistral', models: 'mistral-small-latest' }).models).toEqual(['mistral-small-latest']);
    // Adresse ist bei festen Anbietern nicht änderbar
    expect(resolveProvider({ providerId: 'openai', baseUrl: 'https://boese.example' }).baseUrl).toBe('https://api.openai.com/v1');
  });

  it('wandelt das Copilot-Schema in ein JSON-Schema mit fester Feldreihenfolge um', () => {
    const schema = toJsonSchema(PROCESS_MODEL_SCHEMA);
    expect(JSON.stringify(schema)).not.toMatch(/"[A-Z]+"/);
    expect(JSON.stringify(schema)).not.toContain('propertyOrdering');
    expect(schema.additionalProperties).toBe(false);
    const step = schema.properties.steps.items;
    expect(Object.keys(step.properties)).toEqual(PROCESS_MODEL_SCHEMA.properties.steps.items.propertyOrdering);
    expect(step.properties.kind).toEqual({ type: 'string', enum: ['task', 'document', 'system', 'wait', 'decision', 'end'] });
    expect(step.properties.transitions.items.additionalProperties).toBe(false);
  });
});
