BEGIN
IF EXISTS (SELECT 1 
           FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_TYPE='BASE TABLE' 
           AND TABLE_NAME='elfinder_file')      
DROP TABLE elfinder_file
END

SET ANSI_NULLS ON

SET QUOTED_IDENTIFIER ON

SET ANSI_PADDING ON

CREATE TABLE [dbo].[elfinder_file](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[parent_id] [int] NOT NULL,
	[name] [varchar](256) NOT NULL,
	[content] [varbinary](max) NOT NULL,
	[size] [int] NOT NULL,
	[mtime] [int] NOT NULL,
	[mime] [varchar](256) NOT NULL,
	[read] [bit] NOT NULL,
	[write] [bit] NOT NULL,
	[locked] [bit] NOT NULL,
	[hidden] [bit] NOT NULL,
	[width] [int] NOT NULL,
	[height] [int] NOT NULL,
 CONSTRAINT [PK_elfinder_file] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX  = OFF, STATISTICS_NORECOMPUTE  = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS  = ON, ALLOW_PAGE_LOCKS  = ON) ON [PRIMARY]
) ON [PRIMARY]



SET ANSI_PADDING OFF

ALTER TABLE [dbo].[elfinder_file] ADD  CONSTRAINT [DF__elfinder_f__mtime]  DEFAULT ((0)) FOR [mtime]


ALTER TABLE [dbo].[elfinder_file] ADD  CONSTRAINT [DF__elfinder_f__size]  DEFAULT ((0)) FOR [size]


ALTER TABLE [dbo].[elfinder_file] ADD  CONSTRAINT [DF__elfinder_f__mime]  DEFAULT ('unknown') FOR [mime]


ALTER TABLE [dbo].[elfinder_file] ADD  CONSTRAINT [DF__elfinder_f__read]  DEFAULT ('1') FOR [read]


ALTER TABLE [dbo].[elfinder_file] ADD  CONSTRAINT [DF__elfinder_f__write]  DEFAULT ('1') FOR [write]


ALTER TABLE [dbo].[elfinder_file] ADD  CONSTRAINT [DF__elfinder_f__locked]  DEFAULT ('0') FOR [locked]


ALTER TABLE [dbo].[elfinder_file] ADD  CONSTRAINT [DF__elfinder_f__hidden]  DEFAULT ('0') FOR [hidden]


INSERT INTO elfinder_file 
(parent_id, name, content, size, mtime, mime, [read], write, locked, hidden, width, height) VALUES 
('0', 'DATABASE', convert(varbinary(max),''), '0', '', 'directory', '1', '1', '0', '0', '0', '0');

SELECT * from elfinder_file
