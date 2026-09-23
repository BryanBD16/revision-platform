import { readingModuleType } from './reading-module-type';

describe('readingModuleType', () => {
  it('converts the form to trimmed content', () => {
    const form = readingModuleType.createForm();
    form.setValue({ title: '  Introduction ', body: '  Some text  ' });

    expect(readingModuleType.toContent(form)).toEqual({ title: 'Introduction', body: 'Some text' });
  });

  it('sends a blank title as null', () => {
    const form = readingModuleType.createForm();
    form.setValue({ title: '   ', body: 'Some text' });

    expect(readingModuleType.toContent(form).title).toBeNull();
  });

  it('fills the form with existing content', () => {
    const form = readingModuleType.createForm({ title: null, body: 'Some text' });

    expect(form.getRawValue()).toEqual({ title: '', body: 'Some text' });
    expect(readingModuleType.toContent(form)).toEqual({ title: null, body: 'Some text' });
  });

  it('requires a non-blank text to read', () => {
    const form = readingModuleType.createForm();
    form.setValue({ title: 'Title', body: '   ' });

    expect(form.controls.body.hasError('required')).toBe(true);
  });
});
