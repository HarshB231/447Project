Place static assets (images, icons, pattern backgrounds) in this folder.
They are served from the site root. Example:
  public/pattern-md.png  ->  /pattern-md.png
  public/umbc-shield.png ->  /umbc-shield.png

After adding the pattern file, you can reference it in CSS like:
  .main { background: url('/pattern-md.png') repeat; background-size: 520px auto; }

