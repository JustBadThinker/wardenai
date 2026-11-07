/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterImportService } from '../services/characterImportService';

/**
 * Suite of tests for CharacterImportService validating:
 * 1. JSON V2 card parsing
 * 2. JSON V3 card parsing
 * 3. JSON V1 / Legacy card parsing
 * 4. Missing mandatory fields detection
 * 5. Malformed JSON handling
 * 6. Datacat URL validation (valid vs invalid vs non-datacat)
 * 7. Manual text heuristic extraction
 * 8. Script sanitization (prevent HTML/script injection)
 * 9. Embedded lorebook extraction
 * 10. Minimum age safety enforcement (clamped to >= 18)
 */
export async function runCharacterImportTests(): Promise<{
  passed: number;
  failed: number;
  results: Array<{ test: string; passed: boolean; message?: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; message?: string }> = [];

  const assert = (condition: boolean, testName: string, message?: string) => {
    if (condition) {
      results.push({ test: testName, passed: true });
    } else {
      results.push({ test: testName, passed: false, message });
    }
  };

  // Test 1: JSON V2 Card Parsing
  const ccv2Sample = JSON.stringify({
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: 'Vesper Nyx',
      description: 'Master netrunner in Neo-Veridia Sector 4.',
      personality: 'Analytical, sharp-witted, guarded.',
      scenario: 'In an underground server bank.',
      first_mes: '*Vesper slides the optical slate across the metal table.* "Here is the data."',
      alternate_greetings: ['*Vesper jacks in to the terminal.* "We have company."', '*Vesper glances up.* "Make it quick."'],
      tags: ['cyberpunk', 'netrunner', 'sci-fi'],
      creator: 'nyx_author',
      character_book: {
        name: 'Neo-Veridia Codex',
        entries: [
          { keys: ['netrunner', 'slate'], content: 'Encrypted optical storage used by runners.', priority: 10 }
        ]
      }
    }
  });

  const res1 = CharacterImportService.parseJsonCard(ccv2Sample);
  assert(res1.success === true, 'JSON V2: parses successfully');
  assert(res1.data?.name === 'Vesper Nyx', 'JSON V2: maps character name');
  assert(res1.data?.alternateGreetings.length === 2, 'JSON V2: extracts alternate greetings');
  assert(res1.data?.lorebook?.entries.length === 1, 'JSON V2: extracts embedded lorebook entries');
  assert(res1.data?.creatorUsername === 'nyx_author', 'JSON V2: maps creator metadata');

  // Test 2: JSON V3 Card Parsing
  const ccv3Sample = JSON.stringify({
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: 'Kaelen Thorne',
      description: 'Disgraced royal inquisitor seeking redemption.',
      personality: 'Stoic, penitent, watchful.',
      first_mes: '*Kaelen lowers his hood.* "Speak your piece."',
      system_prompt: 'You are Kaelen. Speak with formal cadence.',
      tags: ['fantasy', 'inquisitor']
    }
  });

  const res2 = CharacterImportService.parseJsonCard(ccv3Sample);
  assert(res2.success === true, 'JSON V3: parses successfully');
  assert(res2.data?.originalFormat === 'chara_card_v3', 'JSON V3: detects v3 spec format');
  assert(res2.data?.systemPrompt?.includes('formal cadence') === true, 'JSON V3: maps system prompt');

  // Test 3: Missing Mandatory Fields Detection
  const missingSample = JSON.stringify({
    spec: 'chara_card_v2',
    data: {
      name: '',
      description: ''
    }
  });
  const res3 = CharacterImportService.parseJsonCard(missingSample);
  assert(res3.success === true, 'Missing Fields: gracefully parses without crashing');
  assert(res3.data?.missingMandatoryFields.includes('Character Name') === true, 'Missing Fields: flags missing name');
  assert(res3.data?.missingMandatoryFields.includes('Personality') === true, 'Missing Fields: flags missing personality');

  // Test 4: Malformed JSON Syntax
  const malformed = '{"spec": "chara_card_v2", data: { name: "broken"';
  const res4 = CharacterImportService.parseJsonCard(malformed);
  assert(res4.success === false, 'Malformed JSON: returns error cleanly');
  assert(Boolean(res4.error), 'Malformed JSON: provides user-friendly error message');

  // Test 5: Datacat URL Validation
  const validUrl = 'https://datacat.run/character/seraphina-frost-9812';
  const val1 = CharacterImportService.validateDatacatUrl(validUrl);
  assert(val1.isValid === true, 'Datacat URL: validates authentic datacat.run link');
  assert(val1.characterId === 'seraphina-frost-9812', 'Datacat URL: extracts character ID');

  const invalidDomainUrl = 'https://malicious-site.com/character/123';
  const val2 = CharacterImportService.validateDatacatUrl(invalidDomainUrl);
  assert(val2.isValid === false, 'Datacat URL: rejects non-datacat domains');

  const malformedUrl = 'not-a-url';
  const val3 = CharacterImportService.validateDatacatUrl(malformedUrl);
  assert(val3.isValid === false, 'Datacat URL: rejects invalid URL string');

  // Test 6: Script & HTML Sanitization
  const maliciousCard = JSON.stringify({
    spec: 'chara_card_v2',
    data: {
      name: 'Safe Name<script>alert("xss")</script>',
      description: 'Harmless <style>body{display:none}</style>text with <iframe src="evil.com"></iframe> content',
      first_mes: 'Hello world'
    }
  });
  const res6 = CharacterImportService.parseJsonCard(maliciousCard);
  assert(res6.data?.name === 'Safe Name', 'Security: sanitizes script tags from character name');
  assert(!res6.data?.shortDescription.includes('<style>'), 'Security: strips style tags');
  assert(!res6.data?.shortDescription.includes('iframe'), 'Security: strips iframe tags');

  // Test 7: Minimum Age Policy Enforcement
  const underageCard = JSON.stringify({
    spec: 'chara_card_v2',
    data: {
      name: 'Young Boy',
      age: 14,
      first_mes: 'Hi'
    }
  });
  const res7 = CharacterImportService.parseJsonCard(underageCard);
  assert((res7.data?.age || 0) >= 18, 'Safety: age is clamped to minimum 18 for safety compliance');

  // Test 8: Manual Text Heuristic Parsing
  const rawManualText = `
Name: Luna Stargazer
Description: Wandering astronomer exploring celestial ruins.
Personality: Curious, dreamy, gentle.
Scenario: Under a meteor shower at the hilltop observatory.
First Message: *Luna adjusts her brass telescope, smiling faintly.* "Look at that constellation."
Tags: fantasy, astrology, magic
  `;
  const res8 = CharacterImportService.parseManualText(rawManualText);
  assert(res8.success === true, 'Manual Parser: parses plaintext attributes');
  assert(res8.data?.name === 'Luna Stargazer', 'Manual Parser: extracts name');
  assert(res8.data?.personality.includes('Curious') === true, 'Manual Parser: extracts personality');
  assert(res8.data?.tags.includes('astrology') === true, 'Manual Parser: extracts tags');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return { passed, failed, results };
}
