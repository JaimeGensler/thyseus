import ts from 'typescript';

const IGNORE_TEXT = 'thyseus-ignore';

export function shouldIgnoreNode(node: ts.Node): boolean {
	if (ts.isSourceFile(node)) {
		return false;
	}

	let willIgnore = false;
	try {
		const leadingComments =
			ts.getLeadingCommentRanges(node.getFullText(), 0) ?? [];

		for (const { kind, pos, end } of leadingComments) {
			if (
				kind === ts.SyntaxKind.SingleLineCommentTrivia ||
				kind === ts.SyntaxKind.MultiLineCommentTrivia
			) {
				const commentText = node.getFullText().substring(pos, end);
				if (commentText.includes(IGNORE_TEXT)) {
					willIgnore = true;
				}
			}
		}
	} catch {
		willIgnore = false;
	}
	return willIgnore;
}
