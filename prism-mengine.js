// Prism syntax definition for mengine (Coq-like proof engine language)
// Derived from mengine BNF grammars:
//   src/commandlanguage/bnf.md
//   src/termlanguage/bnf.md
//   src/tacticlanguage/bnf.md

export default function (Prism) {
  Prism.languages["mengine"] = {
    comment: /\(\*[\s\S]*?\*\)/,

    string: {
      pattern: /"(?:[^"\\]|\\.)*"/,
      greedy: true,
    },

    // Vernacular / command keywords
    keyword: [
      {
        // Command-level keywords
        pattern:
          /\b(?:Axiom|Variable|Definition|Theorem|Lemma|Inductive|Fixpoint|Check|Print|Show|Admitted|Ltac2|Type)\b/,
      },
      {
        // Term-level keywords
        pattern:
          /\b(?:fun|forall|fix|let|rec|in|match|with|end|Prop)\b/,
      },
      {
        // Tactic keywords
        pattern:
          /\b(?:intro|intros|apply|eapply|exact|rewrite|erewrite|reflexivity|assumption|split|left|right|exists|cbv)\b/,
      },
      {
        // Ltac2 / metac keywords
        pattern:
          /\b(?:if|then|else|try|repeat|first|progress|lazy_match!|goal)\b/,
      },
      {
        // Show sub-keywords
        pattern: /\b(?:Context|Proof|Goal|State)\b/,
      },
    ],

    builtin: /\b(?:Type|Prop|unit|int|bool|string|constr|context|list|map|true|false)\b/,

    // Structural annotation
    annotation: /\{[\t ]*struct[\t ]+[A-Za-z_'][A-Za-z_'0-9]*[\t ]*\}/,

    // Match branch pipe and arrows
    operator: [
      { pattern: /=>/ },
      { pattern: /->/ },
      { pattern: /:=/ },
      { pattern: /<-/ },
      { pattern: /\|-/ },
      { pattern: /\|/ },
      { pattern: /;/ },
    ],

    // Wildcard pattern
    variable: /\?[A-Za-z_'][A-Za-z_'0-9]*/,

    // Identifiers (after keywords so keywords take priority)
    function: /\b[A-Za-z_'][A-Za-z_'0-9]*(?=\s*(?:\(|:))/,

    number: /\b\d+\b/,

    punctuation: /[().,:\[\]{}]/,
  };

  // Alias so ```mengine works
  Prism.languages["me"] = Prism.languages["mengine"];
}
