<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>New Memo Published</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #626F47; /* SPUP primary green */
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            color: white;
        }
        .logo {
            max-width: 150px;
            height: auto;
        }
        .memo-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #626F47; /* SPUP primary green */
        }
        .memo-content {
            margin-bottom: 20px;
            padding: 0 10px;
        }
        .memo-image {
            width: 100%;
            max-width: 500px;
            margin: 15px 0;
            border-radius: 5px;
            border: 1px solid #eee;
        }
        .memo-meta {
            font-size: 13px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 10px;
        }
        .cta-button {
            display: inline-block;
            background-color: #626F47; /* SPUP primary green */
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            text-align: center;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin-top: 10px;">SPUP Memo System</h1>
    </div>

    <p>Hello,</p>

    <p>A new memo has been published in the SPUP Memo System.</p>

    <div class="memo-title">{{ $memo->title }}</div>

    @if($memo->image)
    <div style="text-align: center;">
        <img src="{{ $message->embed(storage_path('app/public/' . $memo->image)) }}" alt="Memo Image" class="memo-image">
    </div>
    @endif

    <div class="memo-content">
        {!! Str::limit(strip_tags($memo->content), 300) !!}
        @if(strlen(strip_tags($memo->content)) > 300)
            <p>...</p>
        @endif
    </div>

    <a href="{{ url('/') }}" class="cta-button" style="background-color: #626F47; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0;">View Full Memo</a>

    <div class="memo-meta">
        <p>Published by: {{ $memo->author->name }}</p>
        <p>Published on: {{ $memo->published_at->format('F j, Y, g:i a') }}</p>
    </div>

    <div class="footer">
        <p>This is an automated message from the SPUP eMemo System. Please do not reply to this email.</p>
        <p>&copy; {{ date('Y') }} SPUP Memo System. All rights reserved.</p>
    </div>
</body>
</html>
